import React, {
  useRef,
  useMemo,
  useState,
  useImperativeHandle,
} from "react";

import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the grid

// import { AgGridReact } from '@ag-grid-community/react';
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css"; 

// import { ModuleRegistry, } from "@ag-grid-community/core";
// import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
// import { RowGroupingModule } from "@ag-grid-enterprise/row-grouping";
// ModuleRegistry.registerModules([ClientSideRowModelModule]);

export function parseData(data, columnDefs = []) {
  const resultMap = new Map();

  for (let item of data) {
    const rootGroup = resultMap;
    let currentGroup = rootGroup;
    let prevGroup = null;
    let lastColumn = null;

    for (let column of columnDefs) {
      if (!column.rowCustomGroup) continue;

      if (!currentGroup.has(item[column.field])) {
        currentGroup.set(item[column.field], new Map());
      } 
      
      lastColumn = column;
      prevGroup = currentGroup;
      currentGroup = currentGroup.get(item[column.field]);
    }

    let rows = prevGroup.get(item[lastColumn.field]); 
    if (!Array.isArray(rows)) rows = [];

    rows.push(item);
    prevGroup.set(item[lastColumn.field], rows);
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

  useImperativeHandle(ref, () => ({
    addRows(newRows, addIndex) {
      const res = gridRef.current?.api.applyTransaction({
        add: newRows,
        addIndex
      });

      return res;
    },

    updateRows(updateRows) {
      const res = gridRef.current?.api.applyTransaction({
        update: updateRows
      });
      
      return res;
    },

    removeSeleted() {
      const selectedData = gridRef.current.api.getSelectedRows();
      const res = gridRef.current.api.applyTransaction({
        remove: selectedData,
      });

      return res;
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
        node.setExpanded(value);
      });
    }
  }));

  const gridRowData = parseData(rowData, columnDefs);

  defaultColDef = useMemo(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      editable: false,
      unSortIcon: true,
      ...defaultColDef,
    };
  }, []);

  autoGroupColumnDef = useMemo(() => {
    return {
      field: "group_by",
      headerName: "组",
      // checkboxSelection: true,
      headerCheckboxSelection: true,

      filter: true,
      filterParams: {
        filterOptions: ["过滤"],
        maxNumConditions: 1,
        debounceMs: 1000,
      },

      cellRendererParams: {
        checkbox: true
      },
      cellRenderer: 'agGroupCellRenderer',

      valueGetter: (param) => {
        return !param.colDef.cellRendererParams.supperessCount ? `${param.data[param.colDef.field]} (${param.data.children?.length || 0})` : `${param.value}`;
      },
      
      ...autoGroupColumnDef
    };
  }, []);

  const gridOptions = {
    getNodeChildDetails: (node) => {
      console.log(node)
      return {
        group: node.group,
        children: node.children,
        expanded: node.expanded,
      };
    },
  };

  const isRowSelectable = (node) => {
    return true;
  }

  return (
    <div
      style={style}
      className={
        "ag-theme-quartz-dark"
      }
    >
      <AgGridReact
        ref={gridRef}
        gridOptions={gridOptions}
        rowData={gridRowData}
        getRowId={getRowId}
        columnDefs={columnDefs}
        autoGroupColumnDef={autoGroupColumnDef}
        defaultColDef={defaultColDef}
        rowSelection={'multiple'}
        treeData={true}
        groupSelectsChildren={true}
        rowMultiSelectWithClick={true}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        isRowSelectable={isRowSelectable}
      />
    </div>
  );
});

