import React, {
  useRef,
  useMemo,
  useImperativeHandle,
} from "react";

import { AgGridReact } from '@ag-grid-community/react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; 

import { ModuleRegistry, } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { RowGroupingModule } from "@ag-grid-enterprise/row-grouping";
ModuleRegistry.registerModules([ClientSideRowModelModule, RowGroupingModule]);

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
    }
  }));

  defaultColDef = useMemo(() => {
    return {
      flex: 1,
      resizable: true,
      sortable: true,
      editable: false,
      ...defaultColDef,
    };
  }, []);

  autoGroupColumnDef = useMemo(() => {
    return {
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRendererParams: {
        supperessCount: false,
        // checkbox: true
      },
      ...autoGroupColumnDef
    };
  }, []);

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
        rowData={rowData}
        getRowId={getRowId}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        autoGroupColumnDef={autoGroupColumnDef}
        rowSelection={'multiple'}
        groupSelectsChildren={true}
        rowMultiSelectWithClick={true}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        isRowSelectable={isRowSelectable}
        groupDisplayType={'singleColumn'}
      />
    </div>
  );
});

