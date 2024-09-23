// Make sure this file is loaded after config.js

// Use the token from config.js
mapboxgl.accessToken = config.mapboxToken;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-122.9805, 49.2488], // Burnaby coordinates
    zoom: 11 // Adjusted to fit the desired view
});

// Modal functionality
const modal = document.getElementById('about-modal');
const aboutLink = document.getElementById('about-link');
const closeBtn = document.getElementsByClassName('close')[0];

// Show modal on page load
window.onload = function() {
    modal.style.display = 'block';
};

// Open modal when About is clicked
aboutLink.onclick = function() {
    modal.style.display = 'block';
};

// Close modal when X is clicked
closeBtn.onclick = function() {
    modal.style.display = 'none';
};

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

map.on('load', () => {
    fetch('data/routes.json')
        .then(response => response.json())
        .then(data => {
            // Assign unique IDs to each feature
            data.features.forEach((feature, index) => {
                feature.id = index;
            });

            map.addSource('routes', {
                type: 'geojson',
                data: data
                // Remove generateId: true
            });

            // In your map.addLayer function, update the line-width:
            map.addLayer({
                id: 'routes',
                type: 'line',
                source: 'routes',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    'line-sort-key': ['literal', 0]
                },
                paint: {
                    'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#000000', '#FC4C02'],
                    'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 11, 11],
                    'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.8]
                }
            });
            let hoveredRouteId = null;

            map.on('mousemove', 'routes', (e) => {
                if (e.features.length > 0) {
                    if (hoveredRouteId !== null) {
                        map.setFeatureState({ source: 'routes', id: hoveredRouteId }, { hover: false });
                    }
                    hoveredRouteId = e.features[0].id;
                    map.setFeatureState({ source: 'routes', id: hoveredRouteId }, { hover: true });

                    try {
                        map.setLayoutProperty('routes', 'line-sort-key', [
                            'case',
                            ['==', ['id'], hoveredRouteId],
                            1,
                            0
                        ]);
                    } catch (error) {
                        console.error('Error setting layout property:', error);
                    }

                    map.getCanvas().style.cursor = 'pointer';
                    const routeName = document.getElementById('route-name');
                    routeName.textContent = e.features[0].properties.name;
                }
            });

            map.on('mouseleave', 'routes', () => {
                if (hoveredRouteId !== null) {
                    map.setFeatureState({ source: 'routes', id: hoveredRouteId }, { hover: false });
                    try {
                        map.setLayoutProperty('routes', 'line-sort-key', ['literal', 0]);
                    } catch (error) {
                        console.error('Error resetting layout property:', error);
                    }
                }
                hoveredRouteId = null;
                map.getCanvas().style.cursor = '';
                const routeName = document.getElementById('route-name');
                routeName.textContent = '';
            });
        })
        .catch(error => console.error('Error loading routes:', error));
});