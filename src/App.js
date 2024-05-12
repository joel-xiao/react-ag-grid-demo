import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";

import './App.css';

import { GridExample } from './ag-grid';

function App() {
  const gridRef = useRef(null);
  const [rowData, setRowData] = useState([]);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        setRowData(data);

        setTimeout(() => {
          gridRef.current?.addRows(data);
        }, 1000) 
      });
  }, []);

  const onSelectionChanged = (event) => {
    console.log(event.api.getSelectedRows())
  }

  const gridStyle = useMemo(() => ({ width: "100%", height: '90vh' }), []);

  const [columnDefs] = useState([
    { field: "country", checkboxSelection: true, headerCheckboxSelection: true, rowGroup: true, hide: true}, 
    { field: "year", headerName:'年', unSortIcon: true },
    { field: "sport" },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
    };
  }, []);

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerName: '组',
      field: 'group',
      minWidth: 200,
    };
  }, []);

  return (
    <div className="App">
      <GridExample
        ref={gridRef}
        style={gridStyle}
        rowData={rowData}
        columnDefs={columnDefs}
        onGridReady={onGridReady}
        defaultColDef={defaultColDef}
        onSelectionChanged={onSelectionChanged}
        autoGroupColumnDef={autoGroupColumnDef}
      />
    </div>
  );
}

export default App;
