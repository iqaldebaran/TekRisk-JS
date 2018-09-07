//alert(data[0].tb);
// ver fusejs.io
document.getElementById("name-chem").innerHTML = data[122].name;

//----BUSQUEDA POR FUSEJS.IO ------
// var options = {
//     shouldSort: true,
//     threshold: 0.6,
//     location: 0,
//     distance: 100,
//     maxPatternLength: 32,
//     minMatchCharLength: 1,
//     keys: [
//       "name", "cas"
//   ]
//   };
//   var fuse = new Fuse(data, options); // "list" is the item array
//   var result = fuse.search("lpg");

// Para ver que fila se tecleeo: https://www.w3schools.com/jsref/prop_tablerow_rowindex.asp

// https://toni-heittola.github.io/js-datatable/#parameters


$('#example').DataTable({
    data: data,
    columns: [{
            data: "name"
        },
        {
            data: "cas"
        },
    ]
});
var table = $('#example').DataTable();

$('#example tbody').on('click', 'tr', function () {
    document.getElementById("name-chem").innerHTML = data[table.row(this).index()].tb;

   // alert('Row index: ' + table.row(this).index());
});