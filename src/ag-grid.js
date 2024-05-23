import React, {
  useRef,
  useMemo,
  useState,
  useImperativeHandle,
} from "react";

import {AgGridReact} from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

function getUID() {
  var dt = new Date().getTime(); // 当前时间戳
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (dt + Math.random()*16)%16 | 0;
    dt = Math.floor(dt/16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

export function parseData(data, columnDefs = [], getRowId) {
  const resultMap = new Map();

  for (let item of data) {
    const rootGroup = resultMap;
    let currentGroup = rootGroup;
    let lastColumn = null;
    
    item._id = getRowId(item) || getUID();

    for (let column of columnDefs) {
      if (!column.rowCustomGroup) continue;

      if (!currentGroup.has(item[column.field])) {
        currentGroup.set(item[column.field], new Map());
      } 
      
      lastColumn = column;
      currentGroup = currentGroup.get(item[column.field]);
    }

    let rows = currentGroup.get(item[lastColumn.field]); 
    if (!Array.isArray(rows)) rows = [];

    rows.push(item);
    currentGroup.set(item[lastColumn.field], rows);
  };
  
  function parseGroup(groupMap, children = [], parent) {
    for (let [key, value] of groupMap) {
      if (value instanceof Map) {
        const group = {
          group: true,
          expanded: true,
          group_by: key,
          children: [],
          _id: getUID(),
        };
        children.push(group);
        parseGroup(value, group.children, group);

        for (let row of group.children) {
          for (let column of columnDefs) {
            if (!column.rowSum) continue;
            if (!group[column.field]) group[column.field] = 0;
            group[column.field] += row[column.field];
          }
        }

      } else {
        for (let row of value) {
          children.push(row);
          
          for (let column of columnDefs) {
            if (!column.rowSum) continue;
            if (!parent[column.field]) parent[column.field] = 0;
            parent[column.field] += row[column.field];
          }
        }
      }
    }
    return children;
  }
  
  return parseGroup(resultMap);
}

function addGroup (gridRowData, newRows, columnDefs, getRowId) {
  for (let row of newRows) {
    row._id = getRowId(row) || getUID();

    let currentGroup = gridRowData;
    for ( let column of columnDefs) {
      if (!column.rowCustomGroup) continue;
      currentGroup = currentGroup.find( g => g.group_by === row[column.field]);

      if (currentGroup) {
        for (let column of columnDefs) {
          if (!column.rowSum) continue;
          if (!currentGroup[column.field]) currentGroup[column.field] = 0;
          currentGroup[column.field] += row[column.field];
        }

        currentGroup = currentGroup.children;
      } 
    }
    
    if (currentGroup) {
      currentGroup.unshift(row);
    } else {
      gridRowData.push(parseData([row], columnDefs));
    }
  }
}
 
export const GridExample = React.forwardRef((props, ref) => {
  let { style, rowData, columnDefs, defaultColDef, autoGroupColumnDef, onGridReady, onSelectionChanged, getRowId } = props;

  if (!getRowId) getRowId = (row) => row.id;

  const gridRef = useRef(null);
  const gridRowData = parseData(rowData, columnDefs, getRowId);

  function setRowData(rowData) {
    const gridApi = gridRef.current.api;
    const rowHeight = 28;
    let rowIndex = Math.round(gridApi.getVerticalPixelRange().top / rowHeight);
    let prevNode = gridApi.getDisplayedRowAtIndex(rowIndex);
    gridApi.setRowData(rowData);

    // 矫正滚动位置
    if (prevNode) {
      setTimeout(() => {
        let currentNode = null;
        gridApi.forEachNode((rowNode) => {
          if (prevNode.data._id === rowNode.data._id) {
            currentNode = rowNode;
          }
        });
        currentNode && gridApi.ensureIndexVisible(currentNode.rowIndex, "top");
      });
    }
  }

  useImperativeHandle(ref, () => ({
    addRows(newRows, addIndex) {
      addGroup(gridRowData, newRows, columnDefs, getRowId);
       setRowData(gridRowData);
    },

    updateRows(updateRows) {
      gridRef.current?.api.forEachNode(function (node) {
        const row  = updateRows.find( row =>  getRowId(row) === node.data._id || row._id === node.data._id);
        if (row) {
          for (let key of Object.keys(row)) {
            node.data[key] = row[key];
          }
        }
      });
      gridRef.current?.api.refreshCells({force: true})
    },

    removeSeleted() {
      const selectedData = gridRef.current.api.getSelectedRows();
      gridRef.current.api.updateRowData({
        remove: selectedData,
      });
    },

    getSelectedRows() {
      return gridRef.current.api.getSelectedRows();
    },

    getRowData() {
      const rowData = [];
      gridRef.current?.api.forEachNode(function (node) {
        rowData.push(node.data);
      });

      return rowData;
    },

    expandAll(value) {
      gridRef.current?.api.forEachNode(function (node) {
        if (node.group) {
          node.data.expanded = value;
          node.setExpanded(value);
        }
      });
    }
  }));

  defaultColDef = useMemo(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      editable: false,
      unSortIcon: true,
      
      filter: true,
      // filterParams: {
      //   filterOptions: ["过滤"],
      //   maxNumConditions: 1,
      //   debounceMs: 1000,
      // },

      ...defaultColDef,
    };
  }, []);

  autoGroupColumnDef = {
    field: "group_by",
    headerName: "组",
    checkboxSelection: true,
    headerCheckboxSelection: true,

    cellRendererParams: {
      suppressCount: true,
      // checkbox: true,
    },

    cellRenderer: 'agGroupCellRenderer',
    valueGetter: (param) => {
      if (!param.data.group) return '';
      return `${param.data[param.colDef.field]} (${param.data.children?.length || 0})`; 
    },
    ...autoGroupColumnDef
  };

  const ColumnDefs = [autoGroupColumnDef, ...columnDefs].map( r => ({...r}));
  for (let column of ColumnDefs) {
    delete column.rowCustomGroup;
    delete column.rowSum;
  }

  const getNodeChildDetails = (node) => {
    return {
      group: node.group,
      children: node.children,
      expanded: node.expanded,
    };
  }

  const onRowGroupOpened = (row ) => {
    row.data.expanded = !row.data.expanded;
  }

  const isRowSelectable = (node) => {
    return true;
  }

  const getGridRowId = (row) => {
    return row._id;
  }

  return (
    <div
      style={style}
      className={
        "ag-theme-balham"
      }
    >
      <AgGridReact
        ref={gridRef}
        rowData={gridRowData}
        getRowId={getGridRowId}
        columnDefs={ColumnDefs}
        autoGroupColumnDef={autoGroupColumnDef}
        defaultColDef={defaultColDef}
        rowSelection={'multiple'}
        animateRows={true}
        groupSelectsChildren={true}
        // rowMultiSelectWithClick={true}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        isRowSelectable={isRowSelectable}
        getNodeChildDetails={getNodeChildDetails}
        onRowGroupOpened={onRowGroupOpened}
      />
    </div>
  );
});

