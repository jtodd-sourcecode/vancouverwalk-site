mapboxgl.accessToken = config.mapboxToken;

const ANIMATION_MS = 4000;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-122.9805, 49.2488],
  zoom: window.innerWidth < 768 ? 9 : 10.5,
  attributionControl: false,
});

const modal = document.getElementById("about-modal");
const modalBody = document.querySelector(".modal-body");
const aboutLink = document.getElementById("about-link");
const aboutPage1 = document.getElementById("about-page-1");
const aboutPage2 = document.getElementById("about-page-2");
const closeBtn = document.querySelector(".close");
const walkStats = document.getElementById("walk-stats");
const routeName = document.getElementById("route-name");

aboutLink.addEventListener("click", (event) => {
  event.preventDefault();
  modal.classList.add("show");
  aboutPage1.style.display = "block";
  aboutPage2.style.display = "none";
  document.body.classList.add("modal-open");
});

function closeModal() {
  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

closeBtn.addEventListener("click", (event) => {
  closeModal();
  event.stopPropagation();
});

window.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

modalBody.addEventListener("click", () => {
  if (aboutPage1.style.display === "none") {
    aboutPage1.style.display = "block";
    aboutPage2.style.display = "none";
  } else {
    aboutPage1.style.display = "none";
    aboutPage2.style.display = "block";
  }
});

// Walk names are "YYYY Walk N" — parse to a numeric sort key
function walkSortKey(name) {
  const m = name.match(/^(\d{4}) Walk (\d+)$/);
  return m ? parseInt(m[1]) * 1000 + parseInt(m[2]) : 0;
}

map.on("load", () => {
  fetch("data/routes.json")
    .then((response) => response.json())
    .then((data) => {
      const sorted = [...data.features].sort(
        (a, b) => walkSortKey(a.properties.name) - walkSortKey(b.properties.name)
      );
      sorted.forEach((feature, index) => {
        feature.id = index;
      });

      const totalKm = sorted.reduce((sum, f) => sum + (f.properties.distance_km || 0), 0);
      const defaultStats = totalKm > 0
        ? `${sorted.length} walks · ${Math.round(totalKm)} km`
        : `${sorted.length} walks`;
      walkStats.textContent = defaultStats;

      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          "line-sort-key": ["literal", 0],
        },
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#000000",
            "#FC4C02",
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["case", ["boolean", ["feature-state", "hover"], false], 5, 3],
            15,
            ["case", ["boolean", ["feature-state", "hover"], false], 27, 25],
            20,
            ["case", ["boolean", ["feature-state", "hover"], false], 47, 45],
          ],
          // Required for z-order: case expression triggers feature-state re-evaluation
          // even though both values are identical. Do not simplify.
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.7,
            0.7,
          ],
        },
      });

      const displayed = [];
      let animIndex = 0;
      const animTimer = setInterval(() => {
        displayed.push(sorted[animIndex++]);
        map.getSource("routes").setData({ type: "FeatureCollection", features: displayed });
        if (animIndex >= sorted.length) clearInterval(animTimer);
      }, ANIMATION_MS / sorted.length);

      let hoveredRouteId = null;

      map.on("mousemove", "routes", (e) => {
        if (e.features.length > 0) {
          if (hoveredRouteId !== null) {
            map.setFeatureState({ source: "routes", id: hoveredRouteId }, { hover: false });
          }
          hoveredRouteId = e.features[0].id;
          map.setFeatureState({ source: "routes", id: hoveredRouteId }, { hover: true });
          map.setLayoutProperty("routes", "line-sort-key", [
            "case", ["==", ["id"], hoveredRouteId], 1, 0,
          ]);
          map.getCanvas().style.cursor = "pointer";
          const props = e.features[0].properties;
          routeName.textContent = `Walk ${e.features[0].id + 1}` + (props.distance_km ? ` · ${Math.round(props.distance_km)}km` : "");
        }
      });

      map.on("mouseleave", "routes", () => {
        if (hoveredRouteId !== null) {
          map.setFeatureState({ source: "routes", id: hoveredRouteId }, { hover: false });
          map.setLayoutProperty("routes", "line-sort-key", ["literal", 0]);
          hoveredRouteId = null;
        }
        map.getCanvas().style.cursor = "";
        routeName.textContent = "";
      });

      map.on("click", "routes", (e) => {
        const props = e.features[0].properties;
        const info = `Walk ${e.features[0].id + 1}` + (props.distance_km ? ` · ${Math.round(props.distance_km)}km` : "");
        if (window.innerWidth < 768) walkStats.textContent = info;
        else routeName.textContent = info;
      });

      map.on("click", (e) => {
        if (!map.queryRenderedFeatures(e.point, { layers: ["routes"] }).length) {
          routeName.textContent = "";
          walkStats.textContent = defaultStats;
        }
      });
    })
    .catch((error) => console.error("Error loading routes:", error));
});
