let mapaGeneral = null;
let mapaBoletin = null;

function crearCapasBase() {
    return {
        "Claro": L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            {
                maxNativeZoom: 16,
                maxZoom: 20,
                attribution: "Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors"
            }
        ),
        "OpenStreetMap": L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap contributors"
            }
        ),
        "Satélite": L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                attribution: "Tiles &copy; Esri"
            }
        ),
        "Relieve suave": L.layerGroup([
            L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
                {
                    maxNativeZoom: 16,
                    maxZoom: 20,
                    attribution: "Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors"
                }
            ),
            L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
                {
                    maxNativeZoom: 13,
                    maxZoom: 20,
                    opacity: 0.42,
                    attribution: "Hillshade &copy; Esri"
                }
            ),
            L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
                {
                    maxNativeZoom: 16,
                    maxZoom: 20,
                    attribution: "Labels &copy; Esri, HERE, Garmin"
                }
            )
        ])
    };
}

function agregarControlesMapa(mapa, capasBase) {
    capasBase.Claro.addTo(mapa);

    const control = L.control({ position: "bottomright" });
    control.onAdd = function () {
        const barra = L.DomUtil.create("div", "map-toolbar");
        const acercar = L.DomUtil.create("button", "", barra);
        const alejar = L.DomUtil.create("button", "", barra);
        const selector = L.DomUtil.create("select", "", barra);
        selector.setAttribute("aria-label", "Mapa base");

        acercar.type = "button";
        acercar.textContent = "+";
        acercar.title = "Acercar";
        acercar.setAttribute("aria-label", "Acercar");
        alejar.type = "button";
        alejar.textContent = "−";
        alejar.title = "Alejar";
        alejar.setAttribute("aria-label", "Alejar");

        Object.keys(capasBase).forEach(nombre => {
            const opcion = document.createElement("option");
            opcion.value = nombre;
            opcion.textContent = nombre;
            selector.appendChild(opcion);
        });

        acercar.addEventListener("click", () => mapa.zoomIn());
        alejar.addEventListener("click", () => mapa.zoomOut());
        selector.addEventListener("change", () => {
            Object.values(capasBase).forEach(capa => mapa.removeLayer(capa));
            capasBase[selector.value].addTo(mapa);
        });

        L.DomEvent.disableClickPropagation(barra);
        L.DomEvent.disableScrollPropagation(barra);
        return barra;
    };
    control.addTo(mapa);
}

// ============================================================
// MAPA GENERAL
// ============================================================

export function crearMapaGeneral(
    volcanesGeoJSON,
    estacionesGeoJSON,
    onVolcanClick,
    municipiosAntioquiaGeoJSON
) {
    const contenedor = document.getElementById("general-map");

    if (!contenedor) {
        throw new Error("No existe #general-map");
    }

    if (mapaGeneral) {
        mapaGeneral.remove();
        mapaGeneral = null;
    }

    mapaGeneral = L.map(
        "general-map",
        {
            zoomControl: false
        }
    );

    const capasBase = crearCapasBase();
    agregarControlesMapa(mapaGeneral, capasBase);

    let capaMunicipios = null;
    if (municipiosAntioquiaGeoJSON) {
        capaMunicipios = L.geoJSON(
            municipiosAntioquiaGeoJSON,
            {
                style: function () {
                    return {
                        color: "#45546a",
                        weight: 0.55,
                        opacity: 0.45,
                        fillColor: "#ffffff",
                        fillOpacity: 0.03
                    };
                },
                onEachFeature: function (feature, layer) {
                    const nombre = feature.properties?.municipality || "Municipio";
                    layer.bindTooltip(nombre, { sticky: true });
                }
            }
        ).addTo(mapaGeneral);
    }

    const capaVolcanes = L.geoJSON(
        volcanesGeoJSON,
        {
            pointToLayer: function (feature, latlng) {
                const claseMarcador = feature.properties?.tiene_insar
                    ? "volcano-marker-insar"
                    : "volcano-marker-no-insar";
                const iconoVolcan = L.divIcon({
                    className: "volcano-marker-container",
                    html: `<div class="volcano-marker ${claseMarcador}"></div>`,
                    iconSize: [20, 18],
                    iconAnchor: [10, 9]
                });

                return L.marker(
                    latlng,
                    {
                        icon: iconoVolcan
                    }
                );
            },

            onEachFeature: function (feature, layer) {
                const propiedades = feature.properties || {};
                const nombre = propiedades.nombre || "Volcán de lodo";
                const id = propiedades.id;

                layer.bindTooltip(
                    nombre,
                    {
                        direction: "top",
                        offset: [0, -8]
                    }
                );

                layer.on(
                    "click",
                    function () {
                        if (
                            id &&
                            typeof onVolcanClick === "function"
                        ) {
                            onVolcanClick(id);
                        }
                    }
                );
            }
        }
    ).addTo(mapaGeneral);

    let capaEstaciones = null;

    if (
        estacionesGeoJSON &&
        Array.isArray(estacionesGeoJSON.features)
    ) {
        capaEstaciones = L.geoJSON(
            estacionesGeoJSON,
            {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(
                        latlng,
                        {
                            radius: 6,
                            weight: 0,
                            fillColor: "#176b87",
                            fillOpacity: 1
                        }
                    );
                },

                onEachFeature: function (feature, layer) {
                    const propiedades = feature.properties || {};
                    const nombre =
                        propiedades.nombre ||
                        propiedades.id ||
                        "Estación sísmica";

                    layer.bindTooltip(
                        nombre,
                        {
                            direction: "top"
                        }
                    );

                    layer.bindPopup(
                        `<strong>${nombre}</strong>`
                    );
                }
            }
        ).addTo(mapaGeneral);
    }

    const capasSuperpuestas = {
        "Volcanes de lodo": capaVolcanes
    };

    if (capaMunicipios) {
        capasSuperpuestas["Límite municipal"] = capaMunicipios;
    }

    if (capaEstaciones) {
        capasSuperpuestas["Estaciones sísmicas"] = capaEstaciones;
    }

    L.control.layers(
        {},
        capasSuperpuestas,
        {
            collapsed: true,
            position: "topleft"
        }
    ).addTo(mapaGeneral);

    let limites = capaVolcanes.getBounds();

    if (capaMunicipios?.getBounds().isValid()) {
        limites.extend(capaMunicipios.getBounds());
    }

    if (
        capaEstaciones &&
        capaEstaciones.getBounds().isValid()
    ) {
        if (limites.isValid()) {
            limites.extend(capaEstaciones.getBounds());
        } else {
            limites = capaEstaciones.getBounds();
        }
    }

    if (limites.isValid()) {
        mapaGeneral.fitBounds(
            limites,
            {
                padding: [45, 45],
                maxZoom: 11
            }
        );
    } else {
        mapaGeneral.setView(
            [7.0, -75.5],
            7
        );
    }

    window.setTimeout(
        () => mapaGeneral?.invalidateSize(),
        120
    );

    return mapaGeneral;
}

// ============================================================
// COLORES DE DEFORMACION
// ============================================================

function colorDesplazamiento(valorMetros) {
    if (
        valorMetros === null ||
        valorMetros === undefined ||
        !Number.isFinite(valorMetros)
    ) {
        return null;
    }

    const cm = valorMetros * 100;

    if (cm < -6) return "#d73027";
    if (cm < -4) return "#f46d43";
    if (cm < -2) return "#fdae61";
    if (cm < -1) return "#fee090";
    if (cm < 1) return "#ffffbf";
    if (cm < 2) return "#e0f3f8";
    if (cm < 4) return "#abd9e9";
    if (cm < 6) return "#74add1";

    return "#4575b4";
}

// ============================================================
// MAPA DEL BOLETIN
// ============================================================

export async function crearMapaBoletin(
    observacion,
    areaGeoJSON,
    flujosGeoJSON
) {
    const contenedor = document.getElementById("bulletin-map");

    if (!contenedor) {
        throw new Error("No existe #bulletin-map");
    }

    if (mapaBoletin) {
        mapaBoletin.remove();
        mapaBoletin = null;
    }

    mapaBoletin = L.map(
        "bulletin-map",
        {
            zoomControl: false
        }
    );

    const capasBase = crearCapasBase();
    agregarControlesMapa(mapaBoletin, capasBase);

    mapaBoletin.createPane("rasterPane");
    mapaBoletin.getPane("rasterPane").style.zIndex = 250;

    const capasSuperpuestas = {};
    let limitesFinales = null;

    // --------------------------------------------------------
    // Raster InSAR
    // --------------------------------------------------------

    if (observacion?.raster) {
        const respuesta = await fetch(
            observacion.raster,
            {
                cache: "no-store"
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar el raster ${observacion.raster}. ` +
                `HTTP ${respuesta.status}`
            );
        }

        const arrayBuffer = await respuesta.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        const capaRaster = new GeoRasterLayer({
            georaster: georaster,
            opacity: 0.78,
            resolution: 128,
            pane: "rasterPane",
            pixelValuesToColorFn: valores => {
                if (!valores || valores.length === 0) {
                    return null;
                }

                return colorDesplazamiento(
                    Number(valores[0])
                );
            }
        });

        capaRaster.addTo(mapaBoletin);
        capasSuperpuestas["Deformación InSAR"] = capaRaster;

        const limitesRaster = capaRaster.getBounds();

        if (limitesRaster?.isValid()) {
            limitesFinales = limitesRaster;
        }
    }

    // --------------------------------------------------------
    // Area de estudio
    // --------------------------------------------------------

    if (
        areaGeoJSON &&
        Array.isArray(areaGeoJSON.features) &&
        areaGeoJSON.features.length > 0
    ) {
        const capaArea = L.geoJSON(
            areaGeoJSON,
            {
                style: {
                    color: "#0b2e59",
                    weight: 2,
                    dashArray: "6 5",
                    fillOpacity: 0.03
                }
            }
        ).addTo(mapaBoletin);

        capasSuperpuestas["Área de estudio"] = capaArea;

        if (!limitesFinales && capaArea.getBounds().isValid()) {
            limitesFinales = capaArea.getBounds();
        }
    }

    // --------------------------------------------------------
    // Flujos historicos
    // --------------------------------------------------------

    if (
        flujosGeoJSON &&
        Array.isArray(flujosGeoJSON.features) &&
        flujosGeoJSON.features.length > 0
    ) {
        const capaFlujos = L.geoJSON(
            flujosGeoJSON,
            {
                style: {
                    color: "#8a4f2d",
                    weight: 2,
                    fillColor: "#b87545",
                    fillOpacity: 0.15
                }
            }
        ).addTo(mapaBoletin);

        capasSuperpuestas["Edificios volcánicos"] = capaFlujos;

        if (!limitesFinales && capaFlujos.getBounds().isValid()) {
            limitesFinales = capaFlujos.getBounds();
        }
    }

    L.control.layers(
        {},
        capasSuperpuestas,
        {
            collapsed: true,
            position: "topleft"
        }
    ).addTo(mapaBoletin);

    if (limitesFinales?.isValid()) {
        mapaBoletin.fitBounds(
            limitesFinales,
            {
                padding: [25, 25]
            }
        );
    } else {
        mapaBoletin.setView(
            [8.34, -76.45],
            10
        );
    }

    window.setTimeout(
        () => mapaBoletin?.invalidateSize(),
        120
    );

    return mapaBoletin;
}
