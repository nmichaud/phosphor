/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/

import {
  BasicKeyHandler, BasicMouseHandler, CellRenderer, DataGrid, DataModel
} from '@phosphor/datagrid';

import {
  DockPanel, StackedPanel, Widget
} from '@phosphor/widgets';

import {
  TextIconRenderer as TextRenderer,
  BarRenderer
} from './chartrenderer';

import {
  TickingDataModel, TickingSelectionModel
} from './tickingdatamodel';

import '../style/index.css';

class RandomDataModel extends DataModel {

  static genPoint(): number {
    return Math.random() * 10 - 2;
  }

  constructor(rowCount: number, columnCount: number) {
    super();
    let nr = this._rowCount = rowCount;
    let nc = this._columnCount = columnCount;
    for (let i = 0, n = nr * nc; i < n; ++i) {
      this._data[i] = i / n;
    }
    setInterval(this._tick, 10);
  }

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._rowCount : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? this._columnCount : 1;
  }

  data(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'row-header') {
      return `R: ${row}, ${column}`;
    }
    if (region === 'column-header') {
      return `C: ${row}, ${column}`;
    }
    if (region === 'corner-header') {
      return `N: ${row}, ${column}`;
    }
    return this._data[row * this._columnCount + column];
  }

  private _tick = () => {
    let nr = this._rowCount;
    let nc = this._columnCount;
    let i = Math.floor(Math.random() * (nr * nc - 1));
    let r = Math.floor(i / nc);
    let c = i - r * nc;
    this._data[i] = (this._data[i] + Math.random()) % 1;
    this.emitChanged({
      type: 'cells-changed',
      region: 'body',
      row: r,
      column: c,
      rowSpan: 1,
      columnSpan: 1
    });
  };

  private _rowCount: number;
  private _columnCount: number;
  private _data: number[] = [];
}



const redGreenBlack: CellRenderer.ConfigFunc<string> = ({ value }) => {
  if (value <= 1 / 3) {
    return '#000000';
  }
  if (value <= 2 / 3) {
    return '#FF0000';
  }
  return '#009B00';
};


function createWrapper(content: Widget, title: string): Widget {
  let wrapper = new StackedPanel();
  wrapper.addClass('content-wrapper');
  wrapper.addWidget(content);
  wrapper.title.label = title;
  return wrapper;
}


function formatSingleTooltip(config: CellRenderer.CellConfig) : string {
  let { region, value } = config;
  if (region !== 'body' || value === null || value === undefined) {
    return '';
  }

  let tooltip: string[] = [];

  try {
    let [label, val] = value;
    tooltip.push(
        `<span>${label}:</span><span class="data">${val}</span>`
    );
  } catch (err) {
    tooltip.push(
        `<span class="data">${value}</span>`
    );
  }

  return tooltip.join('');
}


function formatMultiTooltip(config: CellRenderer.CellConfig) : string {
  let { region, value } = config;
  if (region !== 'body' || value === null || value === undefined) {
    return '';
  }

  let tooltip: string[] = [];
  for (let i = 0; i < value.length; i++) {
    let [label, val] = value[i];
    tooltip.push(
      `<span>${label}:</span><span class="data">${val}</span>`
    );
  }

  return tooltip.join('');
}


async function fetchData(model: TickingDataModel): Promise<void> {
  let response = await fetch('https://api.iextrading.com/1.0/market');
  let markets = await response.json();
  /*let markets = [
    {venueName: 'IEX', marketPercent: 10, volume: 10},
    {venueName: 'NYSE', marketPercent: 9, volume: 9},
    {venueName: 'TSX', marketPercent: 8.5, volume: 8.5},
    {venueName: 'LSE', marketPercent: 7, volume: 7},
    {venueName: 'HKG', marketPercent: 6, volume: 6},
    {venueName: 'CHN', marketPercent: 5, volume: 5},
    {venueName: 'NASDAQ', marketPercent: 4, volume: 4},
    {venueName: 'BSX', marketPercent: 3, volume: 3},
    {venueName: 'FSX', marketPercent: 2, volume: 2},
  ];*/

  model.setData(markets, ['marketPercent', 'volume']);
}


function main(): void {

  let model = new TickingDataModel();
  fetchData(model);


  const lineColor = '#DDDDDD';
  const headerColor = '#F5F7F7';
  const headerTextColor = '#737373';
  //const bodyTextColor = '#2B2B2B';

  const font = '400 12px Roboto, "Helvetica Neue", sans-serif';
  const headerFont = '600 12px Roboto, "Helvetica Neue", sans-serif';
  //const axisFont = '300 11px Roboto, "Helvetica Neue", sans-serif';

  const style: DataGrid.Style = {
    ...DataGrid.defaultStyle,
    voidColor: headerColor,
    backgroundColor: '#FFFFFF',
    //gridLineColor: lineColor,    
    verticalGridLineColor: lineColor,
    headerBackgroundColor: headerColor,
    //footerBackgroundColor: headerColor,
    headerHorizontalGridLineColor: lineColor,
    headerVerticalGridLineColor: lineColor,
    //footerGridLineColor: lineColor,
  };

  const defaultSizes: DataGrid.DefaultSizes = {
    rowHeight: 20,
    columnWidth: 200,
    rowHeaderWidth: 100,
    columnHeaderHeight: 20
  };  

  const options: DataGrid.IOptions = {
    defaultSizes: defaultSizes,
    style: style,
    defaultRenderer: new TextRenderer(),
    stretchLastColumn: true
  };

  const fgColorFloatRenderer = new TextRenderer({
    font: font,
    textColor: redGreenBlack,
    format: TextRenderer.formatFixed({ digits: 2 }),
    horizontalAlignment: 'right'
  });

  const barRenderer = new BarRenderer({});
  let grid = new DataGrid(options);
  grid.cellRenderers.update({body: barRenderer});

  let sortAscImg = new Image();
  sortAscImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBhcmlhLWhpZGRlbj0idHJ1ZSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBzdHlsZT0idmVydGljYWwtYWxpZ246IC0wLjE0M2VtOy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpOyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2aWV3Qm94PSIwIDAgMTc2MCAxNzkyIj48cGF0aCBkPSJNNzA0IDE0NDBxMCAxMi0xMCAyNGwtMzE5IDMxOXEtMTAgOS0yMyA5LTEyIDAtMjMtOUw5IDE0NjNxLTE1LTE2LTctMzUgOC0yMCAzMC0yMGgxOTJWMzJxMC0xNCA5LTIzdDIzLTloMTkycTE0IDAgMjMgOXQ5IDIzdjEzNzZoMTkycTE0IDAgMjMgOXQ5IDIzem0xMDU2IDEyOHYxOTJxMCAxNC05IDIzdC0yMyA5SDg5NnEtMTQgMC0yMy05dC05LTIzdi0xOTJxMC0xNCA5LTIzdDIzLTloODMycTE0IDAgMjMgOXQ5IDIzem0tMTkyLTUxMnYxOTJxMCAxNC05IDIzdC0yMyA5SDg5NnEtMTQgMC0yMy05dC05LTIzdi0xOTJxMC0xNCA5LTIzdDIzLTloNjQwcTE0IDAgMjMgOXQ5IDIzem0tMTkyLTUxMnYxOTJxMCAxNC05IDIzdC0yMyA5SDg5NnEtMTQgMC0yMy05dC05LTIzVjU0NHEwLTE0IDktMjN0MjMtOWg0NDhxMTQgMCAyMyA5dDkgMjN6TTExODQgMzJ2MTkycTAgMTQtOSAyM3QtMjMgOUg4OTZxLTE0IDAtMjMtOXQtOS0yM1YzMnEwLTE0IDktMjN0MjMtOWgyNTZxMTQgMCAyMyA5dDkgMjN6IiBmaWxsPSIjNjI2MjYyIi8+PC9zdmc+';

  let sortDescImg = new Image();
  sortDescImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBhcmlhLWhpZGRlbj0idHJ1ZSIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBzdHlsZT0idmVydGljYWwtYWxpZ246IC0wLjE0M2VtOy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpOyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2aWV3Qm94PSIwIDAgMTc2MCAxNzkyIj48cGF0aCBkPSJNMTE4NCAxNTY4djE5MnEwIDE0LTkgMjN0LTIzIDlIODk2cS0xNCAwLTIzLTl0LTktMjN2LTE5MnEwLTE0IDktMjN0MjMtOWgyNTZxMTQgMCAyMyA5dDkgMjN6bS00ODAtMTI4cTAgMTItMTAgMjRsLTMxOSAzMTlxLTEwIDktMjMgOS0xMiAwLTIzLTlMOSAxNDYzcS0xNS0xNi03LTM1IDgtMjAgMzAtMjBoMTkyVjMycTAtMTQgOS0yM3QyMy05aDE5MnExNCAwIDIzIDl0OSAyM3YxMzc2aDE5MnExNCAwIDIzIDl0OSAyM3ptNjcyLTM4NHYxOTJxMCAxNC05IDIzdC0yMyA5SDg5NnEtMTQgMC0yMy05dC05LTIzdi0xOTJxMC0xNCA5LTIzdDIzLTloNDQ4cTE0IDAgMjMgOXQ5IDIzem0xOTItNTEydjE5MnEwIDE0LTkgMjN0LTIzIDlIODk2cS0xNCAwLTIzLTl0LTktMjNWNTQ0cTAtMTQgOS0yM3QyMy05aDY0MHExNCAwIDIzIDl0OSAyM3ptMTkyLTUxMnYxOTJxMCAxNC05IDIzdC0yMyA5SDg5NnEtMTQgMC0yMy05dC05LTIzVjMycTAtMTQgOS0yM3QyMy05aDgzMnExNCAwIDIzIDl0OSAyM3oiIGZpbGw9IiM2MjYyNjIiLz48L3N2Zz4=';

  let cell_options: TextRenderer.IOptions = {
    font: ({ row }) => {
      if (row < 1) return headerFont;
      else return font;
    },
    textColor: headerTextColor,
    horizontalAlignment: ({ row }) => {
      if (row < 1) return 'center';
      else return 'left';
    },
    icon: ({ row, value, metadata }) => {
      let sort = metadata['sort'];
      switch (sort) {
        case 0:
          return sortDescImg;
        case 1:
          return sortAscImg;
      };
      return null;
    }
  };

  grid.cellRenderers.update({'column-header': new TextRenderer(cell_options)});

  grid.keyHandler = new BasicKeyHandler();
  grid.mouseHandler = new BasicMouseHandler({
    dataModel: model,
    tooltipFormatter: formatMultiTooltip
  });

  grid.dataModel = model;
  grid.selectionModel = new TickingSelectionModel({
    dataModel: model,
    selectionMode: 'row',
  });

  let wrapper = createWrapper(grid, 'IEX Venues');

  grid = new DataGrid(options);
  grid.cellRenderers.update({body: fgColorFloatRenderer});
  grid.dataModel = new RandomDataModel(50, 2);

  grid.keyHandler = new BasicKeyHandler();
  grid.mouseHandler = new BasicMouseHandler({
    dataModel: grid.dataModel,
    tooltipFormatter: formatSingleTooltip
  });

  let wrapper2 = createWrapper(grid, 'Test');

  let dock = new DockPanel();
  dock.id = 'dock';

  dock.addWidget(wrapper);
  dock.addWidget(wrapper2, { mode: 'split-right', ref: wrapper });


  window.onresize = () => { dock.update(); };

  Widget.attach(dock, document.body);
}

window.onload = main;
