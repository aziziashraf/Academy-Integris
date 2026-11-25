<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    private function journey(int $days): array
    {
        $done = [];
        for ($d = 1; $d <= $days; $d++) {
            $done[$d] = ['date' => '2026-11-'.str_pad((string) $d, 2, '0', STR_PAD_LEFT), 'quiz' => 90];
        }

        return ['xp' => $days * 40, 'active' => ['2026-11-25'], 'done' => $done, 'early' => [], 'tone' => ['r' => 3, 't' => 4], 'speak' => [], 'fast' => false];
    }

    public function test_pages_load(): void
    {
        $this->get('/')->assertOk()->assertSee('Mandarin in 60 days');
        $this->get('/login')->assertOk()->assertSee('Sign in');
        $this->get('/register')->assertOk()->assertSee('Create your free account');
        $this->get('/forgot-password')->assertOk();
    }

    public function test_user_can_register_and_is_signed_in(): void
    {
        $this->post('/register', [
            'name' => 'Ali',
            'email' => 'ali@example.com',
            'password' => 'nihao2026',
            'password_confirmation' => 'nihao2026',
        ])->assertRedirect('/');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'ali@example.com', 'name' => 'Ali']);
        $this->get('/')->assertSee('ali@example.com', false);
    }

    public function test_registration_rejects_weak_password_and_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->post('/register', ['name' => 'A', 'email' => 'new@example.com', 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertSessionHasErrors('password');
        $this->post('/register', ['name' => 'A', 'email' => 'taken@example.com', 'password' => 'nihao2026', 'password_confirmation' => 'nihao2026'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_login_logout_and_wrong_password(): void
    {
        $user = User::factory()->create(['email' => 'mei@example.com', 'password' => 'xiexie123']);

        $this->post('/login', ['email' => 'mei@example.com', 'password' => 'wrong-pass1'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post('/login', ['email' => 'mei@example.com', 'password' => 'xiexie123'])->assertRedirect('/');
        $this->assertAuthenticatedAs($user);

        $this->post('/logout')->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'lim@example.com']);
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['email' => 'lim@example.com', 'password' => 'bad-pass'.$i]);
        }
        $this->post('/login', ['email' => 'lim@example.com', 'password' => 'bad-pass9'])->assertSessionHasErrors('email');
        $this->assertStringStartsWith('Too many attempts.', session('errors')->first('email'));
    }

    public function test_progress_requires_sign_in(): void
    {
        $this->getJson('/progress')->assertUnauthorized();
        $this->putJson('/progress', ['state' => $this->journey(1)])->assertUnauthorized();
    }

    public function test_progress_is_saved_and_returned(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/progress')->assertOk()->assertJson(['state' => null]);

        $this->actingAs($user)->putJson('/progress', ['state' => $this->journey(3) + ['hack' => 'ignored']])
            ->assertOk()->assertJson(['ok' => true]);

        $this->assertDatabaseHas('learning_progress', ['user_id' => $user->id, 'days_done' => 3, 'xp' => 120]);

        $res = $this->actingAs($user)->getJson('/progress')->assertOk();
        $this->assertSame(120, $res->json('state.xp'));
        $this->assertCount(3, $res->json('state.done'));
        $this->assertArrayNotHasKey('hack', $res->json('state'));

        // Updating again replaces the same row.
        $this->actingAs($user)->putJson('/progress', ['state' => $this->journey(5)])->assertOk();
        $this->assertDatabaseCount('learning_progress', 1);
        $this->assertDatabaseHas('learning_progress', ['user_id' => $user->id, 'days_done' => 5]);
    }

    public function test_progress_rejects_bad_payloads(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/progress', [])->assertStatus(422);
        $this->actingAs($user)->putJson('/progress', ['state' => 'nope'])->assertStatus(422);
        $this->actingAs($user)->putJson('/progress', ['state' => ['xp' => -5]])->assertStatus(422);
        $big = $this->journey(1);
        $big['speak'] = array_fill(0, 20000, ['d' => '2026-11-25', 's' => 90]);
        $this->actingAs($user)->putJson('/progress', ['state' => $big])->assertStatus(422);
    }

    public function test_users_only_see_their_own_progress(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $this->actingAs($a)->putJson('/progress', ['state' => $this->journey(4)])->assertOk();
        $this->actingAs($b)->getJson('/progress')->assertOk()->assertJson(['state' => null]);
    }
}
