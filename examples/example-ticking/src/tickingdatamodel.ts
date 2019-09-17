
import {
  IIterator, map, toArray, range
} from '@phosphor/algorithm';

import {
  SelectionModel, DataModel
} from '@phosphor/datagrid';


export
class TickingDataModel extends DataModel {

  setData(data: any[], fields: string[]): void {
    this._data = data;
    this._fields = fields;
    this._rowCount = data.length;
    this._columnCount = fields.length;

    for (let field of fields) {
      let d = data.map((x: any): number => x[field])
      this._minmax.push([Math.min(0, Math.min(...d)), Math.max(...d)]);
    }
    this._generateSortedIndices();

    setInterval(this._tick, 300);
    this.emitChanged({
      type: 'model-reset',
    });
  }

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._rowCount : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? this._columnCount : 1;
  }

  metadata(region: DataModel.CellRegion, row: number, column: number): DataModel.Metadata {
    let metadata: DataModel.Metadata;
    if (region === 'body') {
      let minmax = this._minmax[column];
      metadata = {min: minmax[0], max: minmax[1]};
      metadata['renderer'] = 'bar';
      return metadata;
    } else if (region === 'column-header' && column === this._sortIndex) {
      metadata = {sort: 0};
      return metadata;
    } else {
      return DataModel.emptyMetadata;
    }
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'row-header') {
      return this._data[this._sortedIndices[row]]['venueName'];
    }
    if (region === 'column-header') {
      return this._fields[column];
    }
    if (region === 'corner-header') {
      return 'venueName';
    }
    return this._data[this._sortedIndices[row]][this._fields[column]];
  }

  tooltip(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'body') {
      let venue = this._data[this._sortedIndices[row]]['venueName'];
      let label = this._fields[column]
      let val = this._data[this._sortedIndices[row]][label];
      return [['venueName', venue], [label, val]];
    }
  }

  /**
   * Selection implementation
   */

  /**
   * Wether the selection model is empty.
   */
  get isEmpty(): boolean {
    return this._selections.length === 0;
  }

  /**
   * The row index of the cursor.
   */
  get cursorRow(): number {
    return this._cursorRow;
  }

  /**
   * The column index of the cursor.
   */
  get cursorColumn(): number {
    return this._cursorColumn;
  }

  /**
   * Get the current selection in the selection model.
   *
   * @returns The current selection or `null`.
   *
   * #### Notes
   * This is the selection which holds the cursor.
   */
  currentSelection(): SelectionModel.Selection | null {
    let selection = this._selections[this._selections.length - 1] || null;
    if (selection !== null) {
      // Map selection
      let r1 = this._reverseIndices[selection.r1];
      return {r1: r1, c1: selection.c1, r2: r1, c2: selection.c2 };
    } else {
      return null;
    }
  }

  /**
   * Get an iterator of the selections in the model.
   *
   * @returns A new iterator of the current selections.
   *
   * #### Notes
   * The data grid will render the selections in order.
   */
  selections(): IIterator<SelectionModel.Selection> {
    // Remap selections from data to grid space
    return map(this._selections,
      (sel: SelectionModel.Selection) :SelectionModel.Selection => {
        return {r1: this._reverseIndices[sel.r1], c1: sel.c1, r2: this._reverseIndices[sel.r1], c2: sel.c2}
      });
  }

  select(args: SelectionModel.SelectArgs): void {
    // Fetch the current row and column counts;
    let rowCount = this.rowCount('body');
    let columnCount = this.columnCount('body');

    // Bail early if there is no content.
    if (rowCount <= 0 || columnCount <= 0) {
      return;
    }

    // Unpack the arguments.
    let { r1, c1, r2, c2, cursorRow, cursorColumn, clear } = args;

    // Clear the necessary selections.
    this._selections.length = 0;
    if (clear === 'all') {
      this._selections.length = 0;
    } else if (clear === 'current') {
      this._selections.pop();
    }

    // Clamp to the data model bounds.
    r1 = Math.max(0, Math.min(r1, rowCount - 1));
    r2 = Math.max(0, Math.min(r2, rowCount - 1));
    c1 = Math.max(0, Math.min(c1, columnCount - 1));
    c2 = Math.max(0, Math.min(c2, columnCount - 1));

    if (r1 > r2) {
      let tmp = r1;
      r1 = r2;
      r2 = tmp;
    }

    // Handle the selection mode.
    if (this.selectionMode === 'row') {
      c1 = 0;
      c2 = columnCount - 1;
    } else if (this.selectionMode === 'column') {
      r1 = 0;
      r2 = rowCount - 1;
    }

    // Alias the cursor row and column.
    let cr = cursorRow;
    let cc = cursorColumn;

    // Compute the new cursor location.
    if (cr < 0 || (cr < r1 && cr < r2) || (cr > r1 && cr > r2)) {
      cr = r1;
    }
    if (cc < 0 || (cc < c1 && cc < c2) || (cc > c1 && cc > c2)) {
      cc = c1;
    }

    // Update the cursor.
    this._cursorRow = cr;
    this._cursorColumn = cc;

    // Add the new selections.
    for (let i = r1; i <= r2; i++) {
      let ix = this._sortedIndices[i];
      this._selections.push({ r1: ix, c1, r2: ix, c2 });
    }
  }

  /**
   * Clear all selections in the selection model.
   */
  clearSelection(): void {
    // Bail early if there are no selections.
    if (this._selections.length === 0) {
      return;
    }

    // Reset the internal state.
    this._cursorRow = -1;
    this._cursorColumn = -1;
    this._selections.length = 0;
  }

  private _generateSortedIndices(): void {
    // Resort data
    let data = this._data;

    let indices = toArray(range(0, this._rowCount));
    let field = this._fields[this._sortIndex];

    indices.sort((a: number, b: number): number => {
      if (data[a][field] < data[b][field]) {
        return 1;
      } else if (data[b][field] < data[a][field]) {
        return -1;
      } else {
        return 0;
      }
    });
    // This is slow - need a better way
    this._reverseIndices = toArray(map(range(0, this._rowCount), (idx: number) => indices.indexOf(idx)));

    if (this._cursorRow !== -1) {  
      let oldCursor = this._sortedIndices[this._cursorRow];
      this._cursorRow = this._reverseIndices[oldCursor];
    }

    this._sortedIndices = indices;
  }

  private _tick = (): void => {
    let nr = this._rowCount;
    let r = Math.floor(Math.random() * (nr - 1));

    let minmax = this._minmax[this._sortIndex];
    let range = minmax[1] - minmax[0];

    let field = this._fields[this._sortIndex];
    this._data[r][field] = Math.random() * range + minmax[0]; //(this._data[i] + Math.random()) % 1;
    this._generateSortedIndices();

    this.emitChanged({
      type: 'cells-changed',
      region: 'row-header',
      row: 0,
      column: 0,
      rowSpan: this._rowCount,
      columnSpan: 1
    });

    this.emitChanged({
      type: 'cells-changed',
      region: 'body',
      row: 0,
      column: 0,
      rowSpan: this._rowCount,
      columnSpan: this._columnCount
    });
  };

  private _data: any[];
  private _rowCount: number = 0;
  private _columnCount: number = 0;
  private _minmax: [number, number][] = [];
  private _sortedIndices: number[];
  private _reverseIndices: number[];
  private _fields: string[] = [];

  private _sortIndex: number = 0;

  private selectionMode = 'row';

  // These are in underlying data space
  private _cursorRow = -1;
  private _cursorColumn = -1;
  private _selections: SelectionModel.Selection[] = [];
}


/**
 * Selection model that defers to the underlying data model
 *
 */
export
class TickingSelectionModel extends SelectionModel {

  /**
   * A signal handler for the data model `changed` signal.
   *
   * @param args - The arguments for the signal.
   */
  protected onDataModelChanged(sender: DataModel, args: DataModel.ChangedArgs): void {
    this.emitChanged();
  }

  /**
   * Wether the selection model is empty.
   */
  get isEmpty(): boolean {
    return (this.dataModel as TickingDataModel).isEmpty;
  }

  /**
   * The row index of the cursor.
   */
  get cursorRow(): number {
    return (this.dataModel as TickingDataModel).cursorRow;
  }

  /**
   * The column index of the cursor.
   */
  get cursorColumn(): number {
    return (this.dataModel as TickingDataModel).cursorColumn;
  }

  /**
   * Get the current selection in the selection model.
   *
   * @returns The current selection or `null`.
   *
   * #### Notes
   * This is the selection which holds the cursor.
   */
  currentSelection(): SelectionModel.Selection | null {
    return (this.dataModel as TickingDataModel).currentSelection();
  }

  /**
   * Get an iterator of the selections in the model.
   *
   * @returns A new iterator of the current selections.
   *
   * #### Notes
   * The data grid will render the selections in order.
   */
  selections(): IIterator<SelectionModel.Selection> {
    return (this.dataModel as TickingDataModel).selections();
  }

  /**
   * Select the specified cells.
   *
   * @param args - The arguments for the selection.
   */
  select(args: SelectionModel.SelectArgs): void {
    (this.dataModel as TickingDataModel).select(args);
    // Emit the changed signal.
    this.emitChanged();
  }

  /**
   * Clear all selections in the selection model.
   */
  clear(): void {
    (this.dataModel as TickingDataModel).clearSelection();
    // Emit the changed signal.
    this.emitChanged();
  }
}
