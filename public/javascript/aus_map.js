var map = L.map("map").setView([-33.505, 148.09], 6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
L.geoJson(mapData).addTo(map);

function style(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0,
    fillColor: "#ffffff",
  };
}

/* global statesData */
const geojson = L.geoJson(mapData, {
  style,
  onEachFeature,
}).addTo(map);

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: onClickNew,
  });
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: "#666",
    dashArray: "",
    fillOpacity: 0.7,
  });

  layer.bringToFront();
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
}

function onClickNew(e) {
  console.log(e);
  //geojson.resetStyle(e.target);
}
