package debouncer

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestDebouncer_CoalescesRapidTriggers(t *testing.T) {
	var count int32
	d := New(context.Background(), 50*time.Millisecond, func(ctx context.Context) {
		atomic.AddInt32(&count, 1)
	})

	for i := 0; i < 10; i++ {
		d.Trigger()
		time.Sleep(5 * time.Millisecond)
	}

	// Wait for the single fire to land.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) && atomic.LoadInt32(&count) == 0 {
		time.Sleep(10 * time.Millisecond)
	}

	// Give a bit more time to ensure no extra fires happen.
	time.Sleep(120 * time.Millisecond)

	if got := atomic.LoadInt32(&count); got != 1 {
		t.Fatalf("expected 1 fire, got %d", got)
	}
}

func TestDebouncer_ResetsOnEachTrigger(t *testing.T) {
	var count int32
	d := New(context.Background(), 40*time.Millisecond, func(ctx context.Context) {
		atomic.AddInt32(&count, 1)
	})

	d.Trigger()
	time.Sleep(20 * time.Millisecond)
	d.Trigger() // reset
	time.Sleep(20 * time.Millisecond)
	d.Trigger() // reset
	time.Sleep(100 * time.Millisecond)

	if got := atomic.LoadInt32(&count); got != 1 {
		t.Fatalf("expected 1 fire, got %d", got)
	}
}

func TestDebouncer_StopPreventsFire(t *testing.T) {
	var count int32
	d := New(context.Background(), 30*time.Millisecond, func(ctx context.Context) {
		atomic.AddInt32(&count, 1)
	})

	d.Trigger()
	if !d.IsRunning() {
		t.Fatal("expected debouncer to be running after Trigger")
	}
	d.Stop()
	if d.IsRunning() {
		t.Fatal("expected debouncer to be stopped after Stop")
	}
	time.Sleep(80 * time.Millisecond)

	if got := atomic.LoadInt32(&count); got != 0 {
		t.Fatalf("expected 0 fires after Stop, got %d", got)
	}
}

func TestDebouncer_MultipleCycles(t *testing.T) {
	var count int32
	d := New(context.Background(), 30*time.Millisecond, func(ctx context.Context) {
		atomic.AddInt32(&count, 1)
	})

	for cycle := 0; cycle < 3; cycle++ {
		d.Trigger()
		deadline := time.Now().Add(time.Second)
		for time.Now().Before(deadline) && atomic.LoadInt32(&count) < int32(cycle+1) {
			time.Sleep(5 * time.Millisecond)
		}
		if got := atomic.LoadInt32(&count); got != int32(cycle+1) {
			t.Fatalf("after cycle %d expected %d fires, got %d", cycle, cycle+1, got)
		}
	}
}

func TestDebouncer_ParentCancel(t *testing.T) {
	var fired int32
	ctx, cancel := context.WithCancel(context.Background())
	d := New(ctx, 20*time.Millisecond, func(ctx context.Context) {
		atomic.AddInt32(&fired, 1)
		// Block until cancelled.
		<-ctx.Done()
	})

	d.Trigger()
	time.Sleep(50 * time.Millisecond) // let the fire happen and the fn block

	if atomic.LoadInt32(&fired) != 1 {
		t.Fatalf("expected 1 fire, got %d", fired)
	}

	cancel()
	// The blocked fn should now return; we can't observe it
	// directly but a panic in the test will surface issues.
}
