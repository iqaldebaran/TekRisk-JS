//----------------------------------------
// TABLA DE DATOS - Usando Datatables.net
//----------------------------------------

//----BUSQUEDA POR FUSEJS.IO - Opcional ------
// var options = {
//   shouldSort: true,
//   threshold: 0.6,
//   location: 0,
//   distance: 100,
//   maxPatternLength: 32,
//   minMatchCharLength: 1,
//   keys: [
//     "name", "cas"
//   ]
// };
// var fuse = new Fuse(data, options); // "list" is the item array
// var result = fuse.search("gas");

// Para ver que fila se tecleeo: https://www.w3schools.com/jsref/prop_tablerow_rowindex.asp

// https://toni-heittola.github.io/js-datatable/#parameters


function dataTable() {
  $('#data-table').DataTable({
    data: data, //data - para toda la tabla
    
    "ordering": false,
    "scrollY": "500px", //Aqui se puede modificar para moviles
    "scrollCollapse": true,
    "paging": false,
    language: {
      search: "_INPUT_",
      searchPlaceholder: "Search..."
    },
    "dom": ' <"search"f><"top"l>rt<"bottom"ip><"clear">',


    columns: [{
        data: "name"
      },
      {
        data: "cas"
      },
    ]
  });
  var table = $('#data-table').DataTable();

  $('#data-table tbody').on('click', 'tr', function () {
    document.getElementById("name-chem").innerHTML = data[table.row(this).index()].name;
    $('#modal-chemicals-db').modal('hide');

    $('#modal-second').modal('show');

    // alert('Row index: ' + table.row(this).index());
  });
}