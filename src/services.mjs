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
  master.gain.value = 0.22;
  master.connect(context.destination);
  const beat = 60 / 112;
  const melody = [
    [72, 76, 79, null, 76, 79, 81, 79],
    [74, 79, 83, null, 81, 79, 76, 74],
    [76, 81, 84, 83, 81, null, 79, 76],
    [77, 81, 84, null, 81, 79, 77, 76],
    [76, 79, 84, null, 83, 81, 79, 76],
    [77, 81, 84, 86, 84, null, 81, 77],
    [79, 83, 86, null, 84, 83, 81, 74],
    [76, 79, 84, 79, 76, 74, 72, null],
  ];
  const chords = [
    [60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69],
    [60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67],
  ];
  const bass = [48, 43, 45, 41, 48, 41, 43, 48];
  const note = (pitch, at, duration, volume, type) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  };
  const phrase = (start) => {
    melody.forEach((bar, barIndex) => {
      const at = start + barIndex * 4 * beat;
      bar.forEach((pitch, step) => {
        if (pitch !== null) note(pitch, at + step * beat / 2, beat * 0.65, 0.38, "triangle");
      });
      for (const offset of [0, 2]) {
        note(bass[barIndex], at + offset * beat, beat * 0.8, 0.24, "sine");
        chords[barIndex].forEach(pitch => note(pitch, at + (offset + 1) * beat, beat * 0.4, 0.1, "triangle"));
      }
    });
  };
  let nextPhrase = 0;
  const schedule = () => {
    if (context.state !== "running" || nextPhrase > context.currentTime + 0.2) return;
    const start = Math.max(nextPhrase, context.currentTime + 0.04);
    phrase(start);
    nextPhrase = start + melody.length * 4 * beat;
  };
  const timer = setInterval(schedule, 100);
  return {
    play: async () => { await context.resume(); schedule(); },
    pause: () => context.suspend(),
    close: () => {
      clearInterval(timer);
      return context.close();
    },
  };
}
