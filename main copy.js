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

    // 既定ベースレイヤーを完全に除去（ボタンでの誤動作防止）
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

    // 古地図4枚
    const providersOld = [
        new Cesium.UrlTemplateImageryProvider({
            url: "https://mapwarper.h-gis.jp/maps/tile/3544/{z}/{x}/{y}.png", // 広根
            credit: new Cesium.Credit("『広根』五万分一地形圖,  https://www.gsi.go.jp/"),
            minimumLevel: 2,
            maximumLevel: 18,
        }),
        
    ];

    // レイヤーを一度だけ追加して参照保持
    const layerSatellite = layers.addImageryProvider(satelliteProvider); // 衛星
    const layerGSI = layers.addImageryProvider(gsiProvider); // 地理院

    const layerOlds = providersOld.map((p) => layers.addImageryProvider(p)); // 古地図4枚

    // 見た目調整（任意）
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

    // アクティブ状態（任意・見た目用）
    function setActive(id) {
        const ids = ["btn-gsi", "btn-satellite", "btn-old"];
        ids.forEach((x) => {
            const el = document.getElementById(x);
            if (el) el.classList.toggle("active", x === id);
        });
    }

    // ボタンにイベント付与（存在する場合のみ）
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
                            [135.268016508585703, 34.868577144026894, 550], [135.279153323744339, 34.869041754901545, 550], [135.28708122606065, 34.878604412245679, 550], [135.290384518692491, 34.876707455305308, 550]
                        ],
                    ],
                },
            },
        ],
    };

    // ===== GeoJSON読込＋スタイル & 線B参照収集 =====
    const guideBEntities = []; // B（空中ガイド）をここに集める

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

                    guideBEntities.push(entity); // Bを収集
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

        // スタート／ゴール（任意）
        viewer.entities.add({
            id: "1",                   // 任意の固定ID（なくてもOK）
            name: "1",
            description: `
    <h3>1</h3>
    <p>PTP情報: ---</p>
    <ul>
      <li>標高: --- </li>
      <li>座標: --- </li>
    </ul>
  `,
            position: Cesium.Cartesian3.fromDegrees(135.268102855045328, 34.86791223312818, 150),
            point: { pixelSize: 8, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
            label: {
                text: "Start",
                font: "14pt sans-serif",
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -9),
            },
        });


        viewer.flyTo(ds);
    } catch (e) {
        console.error("GeoJSON読み込みエラー:", e);
    }

    // ===== 線B（空中ガイド）の表示トグル =====
    function setGuideBVisible(flag) {
        guideBEntities.forEach((ent) => (ent.show = flag));
    }
    // 既定：表示ON
    setGuideBVisible(true);

    // ボタン（id="btn-guideB" があれば利用）／なければ自動生成
    (function initGuideBToggle() {
        let btn = document.getElementById("btn-guideB");
        if (!btn) {
            // 自動で小さなトグルを作る（HTMLを触らずに済む）
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
            btn.textContent = "空中ガイド B";
            btn.style.border = "none";
            btn.style.padding = "6px 10px";
            btn.style.borderRadius = "8px";
            btn.style.cursor = "pointer";
            btn.style.color = "#fff";
            btn.style.background = "#2d8cff";

            holder.appendChild(btn);
            document.body.appendChild(holder);
        } else {
            // 既存スタイルに合わせて .active 反映
            btn.classList.add("active");
        }

        let visible = true;
        const refreshLook = () => {
            if (btn.classList) {
                btn.classList.toggle("active", visible);
            } else {
                // 生成ボタン用（色でON/OFF表現）
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
