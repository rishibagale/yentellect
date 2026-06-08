// Package debouncer provides an event debouncer that coalesces
// rapid successive triggers into a single callback invocation
// after a quiet period.
package debouncer

import (
	"context"
	"sync"
	"time"
)

// Debouncer coalesces events. Each call to Trigger restarts the
// timer. The function fn is invoked once after the configured
// delay has elapsed without a new Trigger call.
//
// The callback receives a context derived from the parent context
// passed to New. Cancelling that context cancels any in-flight
// callback invocation.
type Debouncer struct {
	parent context.Context
	delay  time.Duration
	fn     func(context.Context)

	mu      sync.Mutex
	timer   *time.Timer
	running bool
}

// New returns a new Debouncer. A nil parent is treated as
// context.Background().
func New(parent context.Context, delay time.Duration, fn func(context.Context)) *Debouncer {
	if parent == nil {
		parent = context.Background()
	}
	return &Debouncer{
		parent: parent,
		delay:  delay,
		fn:     fn,
	}
}

// Trigger starts (or restarts) the debounce timer.
func (d *Debouncer) Trigger() {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.timer != nil {
		d.timer.Stop()
	}
	d.running = true
	d.timer = time.AfterFunc(d.delay, d.fire)
}

func (d *Debouncer) fire() {
	d.mu.Lock()
	d.running = false
	d.mu.Unlock()
	d.fn(d.parent)
}

// Stop cancels any pending callback. It does not affect an
// already-firing callback.
func (d *Debouncer) Stop() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.timer != nil {
		d.timer.Stop()
		d.timer = nil
	}
	d.running = false
}

// IsRunning reports whether a callback is currently scheduled
// (i.e. a Trigger has not yet resulted in a fire).
func (d *Debouncer) IsRunning() bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.running
}
