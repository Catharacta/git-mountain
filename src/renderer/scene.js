// このファイルは Puppeteer 内で実行されるクライアントサイド JS と想定
const CONFIG = window.MOUNTAIN_CONFIG;
const DATA = window.MOUNTAIN_DATA;

function initScenario() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(40, 50, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 山脈 (メッシュ) 生成
    const weeks = DATA.weeks;
    const numWeeks = weeks.length;
    const numDays = 7;

    const geometry = new THREE.PlaneGeometry(numWeeks * 2, numDays * 2, numWeeks - 1, numDays - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    const colors = [];
    const colorAttr = new THREE.Float32BufferAttribute([], 3);

    // 頂点ごとの高さと色の設定
    for (let w = 0; w < numWeeks; w++) {
        const days = weeks[w].contributionDays;
        for (let d = 0; d < numDays; d++) {
            const idx = (w * numDays + d) * 3;
            const dayData = days[d] || { normalized: 0 };

            // 高さの設定 (Y座標)
            vertices[idx + 1] = dayData.normalized * CONFIG.render.maxHeightUnits;

            // 色の設定
            const colorHex = window.getColorForHeight(dayData.normalized);
            const color = new THREE.Color(colorHex);
            colors.push(color.r, color.g, color.b);
        }
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        shininess: 30,
        flatShading: false,
        side: THREE.DoubleSide
    });

    const mountain = new THREE.Mesh(geometry, material);
    mountain.receiveShadow = true;
    mountain.castShadow = true;
    scene.add(mountain);

    // 地面 (オプション)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    function animate() {
        renderer.render(scene, camera);
        window.RENDER_DONE = true;
    }
    animate();
}

window.onload = initScenario;
