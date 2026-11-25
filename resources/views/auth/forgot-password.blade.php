@extends('layouts.auth')
@section('title', 'Reset your password')
@section('content')
<h2 style="margin-top:0">Forgot your password?</h2>
<p class="sub">Enter your email and we'll send you a link to choose a new one.</p>
<form method="POST" action="{{ route('password.email') }}" novalidate>
  @csrf
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>
    @error('email')<div class="err">{{ $message }}</div>@enderror
  </div>
  <button class="btn pri big" type="submit">Send reset link</button>
</form>
<div class="links"><a href="{{ route('login') }}">Back to sign in</a></div>
@endsection
