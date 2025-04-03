export interface QueueProvider {
    connect(): Promise<void>;
    publish(topic: string, message: any, key?: string): Promise<void>;
    consume(topic: string, groupId: string, callback: (msg: any) => void): Promise<void>;
    requeue(topic: string, message: any, key?: string, delay?: number): Promise<void>;
}