// Cesium ionのアクセストークン
Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOGRiZmY3Yy0wNzRjLTQ2MjktOGQ0Ni0xYmI5MzFmNDUxZDAiLCJpZCI6MzU0MDY0LCJpYXQiOjE3NjE0NTQ3MDh9.p9q4yTuNNbVz7U09nx04n-LQG0sxXh8TDw22H3FSIV0";

(async function () {
    // ===== Viewer =====
    const viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
    });

    // 既定ベースレイヤーを完全に除去
    while (viewer.imageryLayers.length > 0) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0), false);
    }

    // 任意の見た目
    viewer.scene.globe.enableLighting = true;
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date("2024-06-21T12:00:00Z"));
    viewer.clock.shouldAnimate = false;

    // ===== 地形 =====
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(2767062);
    viewer.terrainProvider = terrainProvider;

    // ===== 画像レイヤー定義 =====
    const layers = viewer.imageryLayers;

    // 衛星（Ion）
    const satelliteProvider = await Cesium.IonImageryProvider.fromAssetId(3830183);

    // 地理院 標準地図
    const gsiProvider = new Cesium.UrlTemplateImageryProvider({
        url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
        credit: new Cesium.Credit(
            '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
        ),
        minimumLevel: 2,
        maximumLevel: 18,
    });

    // 古地図
    const providersOld = [
        new Cesium.UrlTemplateImageryProvider({
            url: "https://mapwarper.h-gis.jp/maps/tile/3544/{z}/{x}/{y}.png",
            credit: new Cesium.Credit("『広根』五万分一地形圖, https://www.gsi.go.jp/"),
            minimumLevel: 2,
            maximumLevel: 18,
        }),
    ];

    // レイヤーを追加
    const layerSatellite = layers.addImageryProvider(satelliteProvider);
    const layerGSI = layers.addImageryProvider(gsiProvider);
    const layerOlds = providersOld.map((p) => layers.addImageryProvider(p));

    // 見た目調整
    [layerSatellite, layerGSI, ...layerOlds].forEach((l) => {
        l.alpha = 1.0;
        l.brightness = 0.95;
    });

    // まず全OFF → 衛星のみON
    function allOff() {
        layerSatellite.show = false;
        layerGSI.show = false;
        layerOlds.forEach((l) => (l.show = false));
    }
    allOff();
    layerSatellite.show = true;

    // 排他的切替
    function showSatellite() {
        allOff();
        layerSatellite.show = true;
        layers.lowerToBottom(layerSatellite);
        setActive("btn-satellite");
    }
    function showGSI() {
        allOff();
        layerGSI.show = true;
        layers.lowerToBottom(layerGSI);
        setActive("btn-gsi");
    }
    function showOldMaps() {
        allOff();
        layerOlds.forEach((l) => (l.show = true));
        layers.raiseToTop(layerOlds[layerOlds.length - 1]);
        setActive("btn-old");
    }

    // アクティブ状態
    function setActive(id) {
        const ids = ["btn-gsi", "btn-satellite", "btn-old"];
        ids.forEach((x) => {
            const el = document.getElementById(x);
            if (el) el.classList.toggle("active", x === id);
        });
    }

    // ボタンにイベント付与
    const btnSat = document.getElementById("btn-satellite");
    const btnGsi = document.getElementById("btn-gsi");
    const btnOld = document.getElementById("btn-old");
    if (btnSat) btnSat.onclick = showSatellite;
    if (btnGsi) btnGsi.onclick = showGSI;
    if (btnOld) btnOld.onclick = showOldMaps;
    setActive("btn-satellite");

    // ===== ルート（GeoJSON） =====
    const routeGeojson = {
        type: "FeatureCollection",
        name: "route",
        crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        features: [
            {
                type: "Feature",
                properties: { name: "B", style: "arrow" },
                geometry: {
                    type: "MultiLineString",
                    coordinates: [
                        [
                            [135.268016508585703, 34.868577144026894, 550],
                            [135.279153323744339, 34.869041754901545, 550],
                            [135.28708122606065, 34.878604412245679, 550],
                            [135.290384518692491, 34.876707455305308, 550]
                        ],
                    ],
                },
            },
        ],
    };

    // ===== GeoJSON読込＋スタイル =====
    const guideBEntities = [];

    try {
        const ds = await Cesium.GeoJsonDataSource.load(routeGeojson);
        viewer.dataSources.add(ds);

        for (const entity of ds.entities.values) {
            const p = entity.properties;
            const style = p?.style?.getValue?.();
            const name = entity.name ?? p?.name?.getValue?.();

            if (entity.polyline) {
                if (style === "arrow" || name === "B") {
                    const yellowTrans = Cesium.Color.YELLOW.withAlpha(0.5);
                    entity.polyline.width = 25;
                    entity.polyline.material = new Cesium.PolylineArrowMaterialProperty(yellowTrans);
                    entity.polyline.clampToGround = false;
                    entity.polyline.heightReference = Cesium.HeightReference.NONE;
                    guideBEntities.push(entity);
                } else {
                    entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.RED,
                        gapColor: Cesium.Color.TRANSPARENT,
                        dashLength: 17,
                    });
                    entity.polyline.width = 4;
                    entity.polyline.clampToGround = true;
                }
            }
        }

        // ===== コールアウト関数 =====
        async function addCallout(viewer, lon, lat, lift, text) {
            const carto = Cesium.Cartographic.fromDegrees(lon, lat);
            const [updated] = await Cesium.sampleTerrainMostDetailed(
                viewer.terrainProvider,
                [carto]
            );
            const groundH = (updated && updated.height) || 0;

            const groundPos = Cesium.Cartesian3.fromDegrees(lon, lat, groundH);
            const airPos = Cesium.Cartesian3.fromDegrees(lon, lat, groundH + lift);

            // 引出線
            viewer.entities.add({
                polyline: {
                    positions: [groundPos, airPos],
                    width: 2,
                    material: Cesium.Color.BLUE.withAlpha(0.9),
                    clampToGround: false,
                },
            });

            // 地面のポイント
            viewer.entities.add({
                position: groundPos,
                point: {
                    pixelSize: 8,
                    color: Cesium.Color.RED,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                },
            });

            // 空中ラベル
            viewer.entities.add({
                position: airPos,
                label: {
                    text: text,
                    font: "14pt sans-serif",
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                },
            });
        }

        // ===== 11個のポイント定義 =====
        const calloutPoints = [
            { lon: 135.268102855045328, lat: 34.86791223312818, lift: 150, text: "1" },
            { lon: 135.272092579146005, lat: 34.868188619584338, lift: 150, text: "2" },
            { lon: 135.2755454274442, lat: 34.869371888597385, lift: 150, text: "3" },
            { lon: 135.277492918100194, lat: 34.869881466357448, lift: 150, text: "4" },
            { lon: 135.282935364960451, lat: 34.871531094734046, lift: 150, text: "5" },
            { lon: 135.283354250243519, lat: 34.872714781788908, lift: 150, text: "6" },
            { lon: 135.284022089840818, lat: 34.873732325977016, lift: 150, text: "7" },
            { lon: 135.287647504797604, lat: 34.876993600682056, lift: 150, text: "8" },
            { lon: 135.289364806619233, lat: 34.877437124047518, lift: 150, text: "9" },
            { lon: 135.287615702912007, lat: 34.877384944952269, lift: 150, text: "10" },
            { lon: 135.290573278271467, lat: 34.876393535849175, lift: 150, text: "11" },
        ];

        // 一括追加
        for (const point of calloutPoints) {
            await addCallout(viewer, point.lon, point.lat, point.lift, point.text);
        }

        viewer.flyTo(ds);
    } catch (e) {
        console.error("GeoJSON読み込みエラー:", e);
    }

    // ===== 線Bトグル =====
    function setGuideBVisible(flag) {
        guideBEntities.forEach((ent) => (ent.show = flag));
    }
    setGuideBVisible(true);

    (function initGuideBToggle() {
        let btn = document.getElementById("btn-guideB");
        if (!btn) {
            const holder = document.createElement("div");
            holder.style.position = "absolute";
            holder.style.top = "10px";
            holder.style.right = "10px";
            holder.style.zIndex = "10";
            holder.style.background = "rgba(0,0,0,.45)";
            holder.style.backdropFilter = "blur(6px)";
            holder.style.borderRadius = "12px";
            holder.style.padding = "6px";

            btn = document.createElement("button");
            btn.id = "btn-guideB";
            btn.textContent = "Summary Route:ON";
            btn.style.border = "none";
            btn.style.padding = "6px 10px";
            btn.style.borderRadius = "8px";
            btn.style.cursor = "pointer";
            btn.style.color = "#fff";
            btn.style.background = "#2d8cff";

            holder.appendChild(btn);
            document.body.appendChild(holder);
        } else {
            btn.classList.add("active");
        }

        let visible = true;
        const refreshLook = () => {
            if (btn.classList) {
                btn.classList.toggle("active", visible);
            } else {
                btn.style.background = visible ? "#2d8cff" : "rgba(255,255,255,.12)";
            }
            btn.textContent = visible ? "Summary Route:ON" : "Summary Route:OFF";
        };
        refreshLook();

        btn.onclick = () => {
            visible = !visible;
            setGuideBVisible(visible);
            refreshLook();
        };
    })();
})();