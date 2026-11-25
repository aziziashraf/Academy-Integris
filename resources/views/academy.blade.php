<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>{{ config('app.name') }} — Learn Mandarin in 60 Days</title>
<meta name="description" content="Learn Mandarin from zero in 60 days: pinyin and tones, daily lessons with native-style audio, pronunciation scoring, recap tests and reading.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ asset('css/academy.css') }}?v=3">
</head>
<body>
<header><div class="top"><div style="font-size:30px">🐼</div><div><h1>{{ config('app.name') }}</h1><div class="sub2">Mandarin in 60 days</div></div>
<div class="chips">
  <div class="chip" id="streak">🔥 0</div><div class="chip" id="xp">⭐ 0</div>
  @auth
    <button class="chip" id="acct" style="border:0;cursor:pointer;color:#fff;font:800 14px Nunito" onclick="go('me')">👤 {{ \Illuminate\Support\Str::limit(auth()->user()->name, 12) }}</button>
  @else
    <a class="chip" id="acct" href="{{ route('login') }}" style="color:#fff;text-decoration:none">Sign in</a>
  @endauth
</div></div></header>
<main id="main"><div class="card" style="text-align:center;margin-top:30px">Loading your lessons… 🐼</div></main>
<nav class="tabbar" id="nav">
 <button data-v="home"><span>🗺️</span>Journey</button>
 <button data-v="pinyin"><span>🔤</span>Pinyin</button>
 <button data-v="speak"><span>🎙️</span>Speak</button>
 <button data-v="read"><span>📖</span>Read</button>
 <button data-v="me"><span>🐼</span>Me</button>
</nav>
<div class="toast" id="toast"></div>
<form id="logoutForm" method="POST" action="{{ route('logout') }}" style="display:none">@csrf</form>
<script>
window.ACADEMY = @json([
    'user' => auth()->user() ? ['id' => auth()->id(), 'name' => auth()->user()->name, 'email' => auth()->user()->email] : null,
    'csrf' => csrf_token(),
    'welcome' => (bool) session('welcome'),
    'routes' => [
        'progress' => route('progress.update', absolute: false),
        'login' => route('login', absolute: false),
        'register' => route('register', absolute: false),
    ],
    'audioBase' => asset('audio').'/',
]);
</script>
<script src="{{ asset('js/academy-data.js') }}?v=3"></script>
<script src="{{ asset('js/audio-manifest.js') }}?v=3"></script>
<script src="{{ asset('js/academy.js') }}?v=3"></script>
</body>
</html>
