import React, {
  useRef,
  useMemo,
  useState,
  useImperativeHandle,
} from "react";

import {AgGridReact} from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

export function parseData(data, columnDefs = []) {
  const resultMap = new Map();

  for (let item of data) {
    const rootGroup = resultMap;
    let currentGroup = rootGroup;
    let lastColumn = null;

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
          children: []
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


export const GridExample = React.forwardRef((props, ref) => {
  let { style, rowData, columnDefs, defaultColDef, autoGroupColumnDef, onGridReady, onSelectionChanged, getRowId } = props;
  const gridRef = useRef(null);
  const gridRowData = parseData(rowData, columnDefs);

  useImperativeHandle(ref, () => ({
    addRows(newRows, addIndex) {
      addGroup(gridRowData, newRows);
      function addGroup (gridRowData, newRows) {
        for (let row of newRows) {
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
       gridRef.current.api.refreshCells({force: true});
    },

    updateRows(updateRows) {
     gridRef.current?.api.updateRowData({
       update: updateRows
     });
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

  const isRowSelectable = (node) => {
    return true;
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
        getRowId={getRowId}
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
      />
    </div>
  );
});

