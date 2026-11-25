<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@yield('title') · {{ config('app.name') }}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ asset('css/academy.css') }}?v=3">
<style>
.auth{max-width:420px;margin:0 auto;padding:28px 16px 60px}
.auth .card{padding:22px}
.field{margin:12px 0}
.field label{display:block;font-weight:800;font-size:14px;margin-bottom:5px}
.field input[type=text],.field input[type=email],.field input[type=password]{width:100%;font:600 16px Nunito,sans-serif;padding:12px 14px;border:2px solid var(--line);border-radius:14px;background:#fff;color:var(--ink);outline:none}
.field input:focus{border-color:var(--coral)}
.err{color:#d43c3c;font-size:13px;font-weight:700;margin-top:4px}
.ok{background:var(--green2);color:#14864f;border-radius:14px;padding:10px 12px;font-weight:700;font-size:14px;margin-bottom:10px}
.links{text-align:center;margin-top:14px;font-weight:700;font-size:14px}
.brand{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:14px;text-decoration:none;color:var(--ink)}
.brand b{font-size:20px;font-weight:900}
.hint{color:var(--muted);font-size:12px;font-weight:700;margin-top:4px}
</style>
</head>
<body>
<div class="auth">
  <a class="brand" href="{{ route('home') }}"><span style="font-size:34px">🐼</span><b>{{ config('app.name') }}</b></a>
  <div class="card">
    @if (session('status'))<div class="ok">{{ session('status') }}</div>@endif
    @yield('content')
  </div>
  <div class="links"><a href="{{ route('home') }}">← Back to lessons</a></div>
</div>
</body>
</html>
