const world = Globe()(document.getElementById("globeViz"))
  .globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
  .lineHoverPrecision(0)
  .polygonAltitude(0.01)
  .polygonCapColor((feat) => "rgba(255, 0, 0, 1)")
  .polygonSideColor(() => "rgba(0, 100, 0, 0.15)")
  .polygonStrokeColor(() => "#111")
  .polygonLabel(
    ({ properties: d }) => `
                <b>${d.ADMIN} (${d.ISO_A2})</b> <br />
                Population: <i>${Math.round(+d.POP_EST / 1e4) / 1e2}M</i>
              `
  )
  .onPolygonHover((hoverD) =>
    world.polygonCapColor((d) => {
      d === hoverD ? "steelblue" : "rgba(0, 100, 0, 0.15)";
    })
  );

var currentIndex = 0;
var countingIndex = 0;
const currentCountry = document.getElementById("currentCountry");
const changingCounter = document.getElementById("changingCounter");
const staticCounter = document.getElementById("staticCounter");

document.getElementById("prev").addEventListener("click", () => {
  if (currentIndex == 0) {
    currentIndex = clickedCountries.length - 1;
  } else {
    currentIndex--;
  }
  currentCountry.innerHTML = clickedCountries[currentIndex];
});
document.getElementById("next").addEventListener("click", () => {
  if (currentIndex == clickedCountries.length - 1) {
    currentIndex = 0;
  } else {
    currentIndex++;
  }
  currentCountry.innerHTML = clickedCountries[currentIndex];
});

fetch("resources/ne_110m_admin_0_sovereignty.json")
  .then((res) => res.json())
  .then((countries) => {
    clickedCountries = [];
    countries.features
      .filter((d) => d.properties.ISO_A2 !== "AQ")
      .forEach((feature) => {
        const countryName = feature.properties.ADMIN;
        clickedCountries.push(countryName);
      });

    // SEt initial country prompt
    currentCountry.innerHTML = clickedCountries[currentIndex];
    staticCounter.innerHTML = Object.keys(countries.features).length;

    const world = Globe()
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-day.jpg")
      //   .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .backgroundColor("rgba(0, 0, 0, 0)")
      .height("600")
      .width("600")
      .lineHoverPrecision(0)
      .polygonsData(
        countries.features.filter((d) => d.properties.ISO_A2 !== "AQ")
      )
      .polygonAltitude(0.015)
      .polygonCapColor((feat) => "rgba(0, 0, 0, 0)")
      .polygonSideColor(() => "rgba(0, 0, 0, 0)")
      .polygonStrokeColor(() => "rgba(0, 0, 0, 0)")
      .onPolygonClick((clickD) => {
        // Check if the clicked on country equals the prompted country
        if (clickD.properties.ADMIN === clickedCountries[currentIndex]) {
          // update clicked countries list
          const index = clickedCountries.indexOf(clickD.properties.ADMIN);
          if (index > -1) {
            // only splice array when item is found
            clickedCountries.splice(index, 1); // 2nd parameter means remove one item only
          }
          //Incremement currentIndex by 1 and update the prompt
          if (currentIndex == clickedCountries.length) {
            currentIndex = 0;
          }
          currentCountry.innerHTML = clickedCountries[currentIndex];
          countingIndex++;
          changingCounter.innerHTML = countingIndex;

          world.polygonCapColor((d) =>
            clickedCountries.includes(d.properties.ADMIN)
              ? "rgba(0, 0, 0, 0)"
              : "rgba(255, 0, 0, 0.5)"
          );
          world.polygonLabel((d) => {
            if (clickedCountries.includes(d.properties.ADMIN)) {
              return ``;
            } else {
              return `<b>${d.properties.ADMIN}</b>`;
            }
          });
          // Check if game over
          if (clickedCountries.length == 0) {
            currentCountry.innerHTML = "Congratulations";
          }
        }
      })
      .polygonsTransitionDuration(300)(document.getElementById("globeViz"));
  });
