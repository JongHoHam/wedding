export function mapLinks(venue) {
  const name = encodeURIComponent(venue.name);
  return {
    naver: `https://map.naver.com/p/search/${name}`,
    naverApp: `nmap://route/public?dlat=${venue.lat}&dlng=${venue.lng}&dname=${name}&appname=our.wedding.invitation`,
    kakao: `https://map.kakao.com/link/to/${name},${venue.lat},${venue.lng}`,
    tmap: `tmap://route?goalname=${name}&goalx=${venue.lng}&goaly=${venue.lat}`,
    google: `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`,
    apple: `https://maps.apple.com/?ll=${venue.lat},${venue.lng}&q=${name}`,
    android: `geo:${venue.lat},${venue.lng}?q=${venue.lat},${venue.lng}(${name})`,
  };
}

export function sharePayload(config, base) {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  const location = new URL(url);
  location.searchParams.set("view", "location");
  return {
    objectType: "feed",
    content: {
      title: config.title,
      description: config.description,
      imageUrl: new URL(config.shareImage, url).href,
      link: { mobileWebUrl: url.href, webUrl: url.href },
    },
    buttons: [
      {
        title: "청첩장 보기",
        link: { mobileWebUrl: url.href, webUrl: url.href },
      },
      {
        title: "위치 보기",
        link: { mobileWebUrl: location.href, webUrl: location.href },
      },
    ],
  };
}

let kakaoPromise;
export function loadKakao(key) {
  if (!key)
    return Promise.reject(new Error("카카오 연동 키가 등록되지 않았습니다."));
  if (kakaoPromise) return kakaoPromise;
  kakaoPromise = new Promise((resolve, reject) => {
    const initialize = () => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(key);
      resolve(window.Kakao);
    };
    if (window.Kakao) return initialize();
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js";
    script.onload = initialize;
    script.onerror = () => {
      script.remove();
      kakaoPromise = undefined;
      reject(new Error("카카오 서비스를 불러오지 못했습니다."));
    };
    document.head.append(script);
  });
  return kakaoPromise;
}

export function createMusic() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);
  const melody = [
    60, 64, 67, 71, 69, 67, 64, 62, 57, 60, 64, 67, 65, 64, 62, 59,
  ];
  let timer;
  const phrase = () => {
    melody.forEach((note, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const at = context.currentTime + index * 0.62;
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.5, at + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + 2.3);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(at);
      oscillator.stop(at + 2.4);
    });
  };
  phrase();
  timer = setInterval(() => {
    if (context.state === "running") phrase();
  }, 9920);
  return {
    play: () => context.resume(),
    pause: () => context.suspend(),
    close: () => {
      clearInterval(timer);
      return context.close();
    },
  };
}
