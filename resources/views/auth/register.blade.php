@extends('layouts.auth')
@section('title', 'Create your account')
@section('content')
<h2 style="margin-top:0">Create your free account</h2>
<p class="sub">Save your 60-day journey and continue on any device. Progress from this device is added to your account automatically.</p>
<form method="POST" action="{{ route('register') }}" novalidate>
  @csrf
  <div class="field">
    <label for="name">Your name</label>
    <input id="name" type="text" name="name" value="{{ old('name') }}" required maxlength="60" autocomplete="name" autofocus>
    @error('name')<div class="err">{{ $message }}</div>@enderror
  </div>
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email">
    @error('email')<div class="err">{{ $message }}</div>@enderror
  </div>
  <div class="field">
    <label for="password">Password</label>
    <input id="password" type="password" name="password" required autocomplete="new-password">
    <div class="hint">At least 8 characters, with letters and numbers.</div>
    @error('password')<div class="err">{{ $message }}</div>@enderror
  </div>
  <div class="field">
    <label for="password_confirmation">Confirm password</label>
    <input id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password">
  </div>
  <button class="btn pri big" type="submit" style="margin-top:8px">Create account 🎉</button>
</form>
<div class="links">Already have an account? <a href="{{ route('login') }}">Sign in</a></div>
@endsection
