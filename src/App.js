import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";

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
          // gridRef.current?.addRows(data);
        }, 1000) 
      });
  }, []);


  const onAddRows = () => {
    gridRef.current?.addRows(rowData);
  }

  const onSelectionChanged = (event) => {
    console.log(event.api.getSelectedRows())
  }

  const gridStyle = useMemo(() => ({ width: "100%", height: '90vh' }), []);

  const [columnDefs] = useState([
    { field: "country", checkboxSelection: true, headerCheckboxSelection: true, rowCustomGroup: true, hide: true}, 
    { field: "year", headerName:'年', rowCustomGroup: true, hide: true },
    { field: "sport" },
    { field: "gold", rowSum: true },
    { field: "silver", rowSum: true  },
    { field: "bronze", rowSum: true  },
  ]);

  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
    };
  }, []);

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerName: '组',
    };
  }, []);
  return (
    <div className="App">
      <button onClick={onAddRows}> Add Rows</button>
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
