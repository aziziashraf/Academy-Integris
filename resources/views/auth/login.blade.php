@extends('layouts.auth')
@section('title', 'Sign in')
@section('content')
<h2 style="margin-top:0">Welcome back! 你好</h2>
<p class="sub">Sign in to continue your journey.</p>
<form method="POST" action="{{ route('login') }}" novalidate>
  @csrf
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>
    @error('email')<div class="err">{{ $message }}</div>@enderror
  </div>
  <div class="field">
    <label for="password">Password</label>
    <input id="password" type="password" name="password" required autocomplete="current-password">
    @error('password')<div class="err">{{ $message }}</div>@enderror
  </div>
  <div class="field" style="display:flex;justify-content:space-between;align-items:center">
    <label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:700"><input type="checkbox" name="remember" value="1" checked> Keep me signed in</label>
    <a href="{{ route('password.request') }}" style="font-size:14px">Forgot password?</a>
  </div>
  <button class="btn pri big" type="submit">Sign in</button>
</form>
<div class="links">New here? <a href="{{ route('register') }}">Create a free account</a></div>
@endsection
