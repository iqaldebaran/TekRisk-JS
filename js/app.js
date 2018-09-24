// Llamado a la funcion que presenta la tabla
dataTable();
var myLatLng = {
  lat: 19.298897,
  lng: -99.624777
};

function initMap() {
  myLatLng;

  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: myLatLng
  });


}

document.getElementById("btnCenterMap").addEventListener("click", marker1)

function marker1() {
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 20,
    center: myLatLng,
    mapTypeId: 'satellite'
  });
  map.setTilt(0); //Al acercarse el mapa no se pone en 45ª
  var marker = new google.maps.Marker({
    position: myLatLng,
    map: map,
    title: 'Hello World!',
    draggable: true
  });
  console.log(marker.position.lat())

  var circle = new google.maps.Circle({
    strokeOpacity: 1,
    strokeWeight: 1,
    fillColor: "red",
    fillOpacity: .8,
    map: map,
    draggable: true,
    radius: 30
  })

  var circle2 = new google.maps.Circle({
    strokeOpacity: 0.5,
    strokeWeight: 1,
    position: myLatLng,
    fillColor: "green",
    fillOpacity: .5,
    map: map,
    draggable: true,
    radius: 60
  })

  // Se unes los dos ciculos y el marker
  circle.bindTo("center", marker, "position");

  circle2.bindTo("center", marker, "position");


}


// const drawMap = (obj) => {
//   let map = new google.maps.Map(document.getElementById("map"), {
//     center: obj,
//     zoom: 10
//   })
//   let marcadorUsuario = new google.maps.Marker({
//     position: obj,
//     title: "Mi ubicacion"
//   })
// }