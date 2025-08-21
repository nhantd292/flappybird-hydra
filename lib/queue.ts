export default class AsyncQueue {
    private q: Array<() => Promise<void>> = [];
    private running = false;

    enqueue(job: () => Promise<void>) {
        this.q.push(job);
        if (!this.running) this.run();
    }

    private async run() {
        this.running = true;
        while (this.q.length) {
            const job = this.q.shift()!;
            try {
                await job();
            } catch (e) {
                console.error("Queue job error:", e);
            }
        }
        this.running = false;
    }

    // ✅ thêm mấy hàm tiện ích
    getSize() {
        return this.q.length;
    }

    isRunning() {
        return this.running;
    }

    getItems() {
        return this.q; // lưu ý: chỉ để debug, vì trả ra function references
    }
}
