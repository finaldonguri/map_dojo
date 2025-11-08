// Cesium ionのアクセストークン
Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyOGRiZmY3Yy0wNzRjLTQ2MjktOGQ0Ni0xYmI5MzFmNDUxZDAiLCJpZCI6MzU0MDY0LCJpYXQiOjE3NjE0NTQ3MDh9.p9q4yTuNNbVz7U09nx04n-LQG0sxXh8TDw22H3FSIV0";

// 非同期処理を関数でラップ
(async function () {
    // Cesium Viewerの初期化
    const viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayerPicker: true,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false
    });
    // ★ ここにまとめて置けばすべて正しく動く
    viewer.scene.globe.enableLighting = true;
    // 2024年6月21日 正午（夏至の正午）
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(
        new Date('2024-06-21T12:00:00Z')
    );
    viewer.clock.shouldAnimate = false; // 時間停止
    // GeoJSONを直接ここに貼る
    const routeGeojson = {
        "type": "FeatureCollection",
        "name": "route",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "A",
                    "symbol": null,
                    "style": "Line",
                    "number": null,
                    "comment": null,
                    "description": null,
                    "source": null,
                    "url": null,
                    "url name": null
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [
                            136.34026747483415,
                            35.205964151356866
                        ],
                        [
                            136.339767925555293,
                            35.206522703560395
                        ],
                        [
                            136.340688147911067,
                            35.207016804230143
                        ],
                        [
                            136.341319157526414,
                            35.207833137879973
                        ],
                        [
                            136.342896681564923,
                            35.208176854856227
                        ],
                        [
                            136.344342745266857,
                            35.208434641633573
                        ],
                        [
                            136.345210383487995,
                            35.208950212732979
                        ],
                        [
                            136.345631056564883,
                            35.210840612088582
                        ],
                        [
                            136.345999145507221,
                            35.211742832628175
                        ],
                        [
                            136.346551278920685,
                            35.213805013354808
                        ],
                        [
                            136.346656447189929,
                            35.214556837047724
                        ],
                        [
                            136.347392625074491,
                            35.215759740473558
                        ],
                        [
                            136.347340040939912,
                            35.216704866374656
                        ],
                        [
                            136.347418917141795,
                            35.217649981271236
                        ],
                        [
                            136.348102510891835,
                            35.217564062189922
                        ],
                        [
                            136.348339139497597,
                            35.21799365668705
                        ],
                        [
                            136.349785203199502,
                            35.217735900261602
                        ],
                        [
                            136.350521381084093,
                            35.218723962114048
                        ],
                        [
                            136.351914860651419,
                            35.219368343798614
                        ],
                        [
                            136.351967444786055,
                            35.220163074163857
                        ],
                        [
                            136.353571260891812,
                            35.220248990493971
                        ],
                        [
                            136.353571260891812,
                            35.220248990493971
                        ]
                    ]
                }
            },
            { "type": "Feature", "properties": { "name": "B", "style": "arrow", "symbol": null, "number": null, "comment": null, "description": null, "source": null, "url": null, "url name": null }, "geometry": { "type": "LineString", "coordinates": [[ 136.336810,35.204672, 950], [136.346537, 35.216180, 1150], [ 136.351842,35.220050, 1200]] } }
        ]
    }
        ;



    // 地形: Japan Regional Terrain（先に読み込む）
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(2767062);
    viewer.terrainProvider = terrainProvider;

    // イメージャリー: Google Maps 2D Satellite with Labels（先に読み込む）
    const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(3830183);
    viewer.imageryLayers.addImageryProvider(imageryProvider);

    // 地理院地形図レイヤー（先に読み込む）
    const chikeizuProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
        credit: new Cesium.Credit('<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'),
        minimumLevel: 2,
        maximumLevel: 18
    });
    const chikeizuLayer = viewer.imageryLayers.addImageryProvider(chikeizuProvider);
    chikeizuLayer.alpha = 1.0; // 0.0 is transparent.  1.0 is opaque.
    chikeizuLayer.brightness = 0.95; // > 1.0 increases brightness.  < 1.0 decreases.

    // GeoJSONルートの読み込み

    console.log('GeoJSON読み込み開始:');

    try {
        const dataSource = await Cesium.GeoJsonDataSource.load(routeGeojson);
        console.log('GeoJSON読み込み成功');
        viewer.dataSources.add(dataSource);

        const entities = dataSource.entities.values;
        console.log('エンティティ数:', entities.length);

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            const p = entity.properties;
            const style = p?.style?.getValue?.();           // "Line" or "arrow"
            const name = entity.name ?? p?.name?.getValue?.();

            // ----------- Polyline の設定 -----------
            if (entity.polyline) {
                entity.polyline.width = 5;

                // ★ B = 矢印つき黄色線（clampToGroundを無効化）
                if (style === "arrow" || name === "B") {

                    // 半透明の黄色（RGBA）
                    const yellowTrans = Cesium.Color.YELLOW.withAlpha(0.5);

                    // 太く
                    entity.polyline.width = 20;

                    // 半透明矢印
                    entity.polyline.material =
                        new Cesium.PolylineArrowMaterialProperty(yellowTrans);

                    entity.polyline.clampToGround = false;    // 高度データを使う
                    entity.polyline.heightReference = Cesium.HeightReference.NONE;

                } else {
                    // ★ A = 点線（赤）
                    entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.RED,
                        gapColor: Cesium.Color.TRANSPARENT,   // 点線の「隙間」
                        dashLength: 17,                       // 破線のパターンの長さ
                    });
                    entity.polyline.width = 4;
                    entity.polyline.clampToGround = true;
                }
            }

            // ポイントの設定
            if (entity.position) {
                entity.point = new Cesium.PointGraphics({
                    pixelSize: 10,
                    color: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2
                });

                // スタート地点（緑）
                if (i === 0) {
                    entity.point.pixelSize = 15;
                    entity.point.color = Cesium.Color.GREEN;
                }

                // ゴール地点（青）
                if (i === entities.length - 1) {
                    entity.point.pixelSize = 15;
                    entity.point.color = Cesium.Color.BLUE;
                }
            }
        }

        // 高室山のポイント
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(136.353516, 35.220142, 859),
            point: {
                pixelSize: 8,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            },
            label: {
                text: 'Mt.Takamuro(818m)',
                font: '14pt sans-serif',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -9)
            }
        });
        // スタートのポイント
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees( 136.339884,35.206083, 284),
            point: {
                pixelSize: 8,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            },
            label: {
                text: 'Start/Finish',
                font: '14pt sans-serif',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -9)
            }
        });
        // 霊仙山のポイント
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(136.376960, 35.280262, 1123),
            point: {
                pixelSize: 8,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            },
            label: {
                text: 'Mt.Ryozen(1,083m)',
                font: '14pt sans-serif',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -9)
            }
        });

        // ルートが読み込まれたらカメラをルートに合わせる
        viewer.flyTo(dataSource);

    } catch (error) {
        console.error('GeoJSON読み込みエラー:', error);
    }
})();