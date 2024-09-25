// Set the Mapbox access token from the configuration
mapboxgl.accessToken = config.mapboxToken;

// Initialize the Mapbox map
const map = new mapboxgl.Map({
    container: 'map', // HTML element ID for the map
    style: 'mapbox://styles/mapbox/outdoors-v12', // Map style URL
    center: [-122.9805, 49.2488], // Initial map center [longitude, latitude]
    zoom: 11 // Initial zoom level
});

// Modal elements for the 'About' section
const modal = document.getElementById('about-modal');
const modalBody = document.querySelector('.modal-body');
const aboutLink = document.getElementById('about-link');
const aboutPage1 = document.getElementById('about-page-1');
const aboutPage2 = document.getElementById('about-page-2');
const closeBtn = document.querySelector('.close');

// Display the modal on page load
window.addEventListener('load', () => {
    modal.style.display = 'block';
});

// Function to show the first page of the modal
function showModalFirstPage() {
    modal.style.display = 'block';
    aboutPage1.style.display = 'block';
    aboutPage2.style.display = 'none';
}

// Show the modal when 'About' link is clicked
aboutLink.addEventListener('click', (event) => {
    event.preventDefault();
    showModalFirstPage();
});

// Hide the modal when the close button is clicked
closeBtn.addEventListener('click', (event) => {
    modal.style.display = 'none';
    event.stopPropagation(); // Prevent the click from propagating to the modal body
});

// Hide the modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Add event listener to the modal body to toggle pages on click
modalBody.addEventListener('click', () => {
    if (aboutPage1.style.display === 'none') {
        aboutPage1.style.display = 'block';
        aboutPage2.style.display = 'none';
    } else {
        aboutPage1.style.display = 'none';
        aboutPage2.style.display = 'block';
    }
});

// Load event for the map
map.on('load', () => {
    // Fetch the routes data from the GeoJSON file
    fetch('data/routes.json')
        .then(response => response.json())
        .then(data => {
            // Assign unique IDs to each feature for feature state management
            data.features.forEach((feature, index) => {
                feature.id = index;
            });

            // Add the routes data as a GeoJSON source
            map.addSource('routes', {
                type: 'geojson',
                data: data
            });

            // Add a layer to display the routes
            map.addLayer({
                id: 'routes',
                type: 'line',
                source: 'routes',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    // Initial z-order for line features
                    'line-sort-key': ['literal', 0]
                },
                paint: {
                    // Change line color on hover
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#000000', // Color when hovered
                        '#FC4C02'  // Default color
                    ],
                    // Adjust line width based on zoom level and hover state
                    'line-width': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            5, 3
                        ],
                        15, [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            27, 25
                        ],
                        20, [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            47, 45
                        ]
                    ],
                    // Set line opacity using a case expression to preserve z-order functionality
                    'line-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        0.7,
                        0.7
                    ]
                }
            });

            let hoveredRouteId = null;
            const routeName = document.getElementById('route-name');

            // Event handler for mouse movement over the routes layer
            map.on('mousemove', 'routes', (e) => {
                if (e.features.length > 0) {
                    // Remove hover state from the previously hovered feature
                    if (hoveredRouteId !== null) {
                        map.setFeatureState(
                            { source: 'routes', id: hoveredRouteId },
                            { hover: false }
                        );
                    }

                    // Set hover state on the currently hovered feature
                    hoveredRouteId = e.features[0].id;
                    map.setFeatureState(
                        { source: 'routes', id: hoveredRouteId },
                        { hover: true }
                    );

                    // Bring the hovered route to the top layer
                    map.setLayoutProperty('routes', 'line-sort-key', [
                        'case',
                        ['==', ['id'], hoveredRouteId],
                        1, // Higher sort key for the hovered route
                        0  // Default sort key for other routes
                    ]);

                    // Change the cursor to a pointer
                    map.getCanvas().style.cursor = 'pointer';

                    // Display the name of the hovered route
                    routeName.textContent = e.features[0].properties.name;
                }
            });

            // Event handler for when the mouse leaves the routes layer
            map.on('mouseleave', 'routes', () => {
                if (hoveredRouteId !== null) {
                    // Remove hover state from the previously hovered feature
                    map.setFeatureState(
                        { source: 'routes', id: hoveredRouteId },
                        { hover: false }
                    );

                    // Reset the sort key to default
                    map.setLayoutProperty('routes', 'line-sort-key', ['literal', 0]);

                    hoveredRouteId = null;
                }

                // Reset the cursor to default
                map.getCanvas().style.cursor = '';

                // Clear the route name display
                routeName.textContent = '';
            });
        })
        .catch(error => console.error('Error loading routes:', error));
});