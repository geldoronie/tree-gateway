"use strict";

import "es6-promise";
import * as path from "path";
import * as uuid from "uuid";
import {Redis} from "ioredis";
import {ConfigTopics} from "../config/events";
import {AutoWired, Inject, Provides} from "typescript-ioc";
import {Database} from "../database";

export abstract class MiddlewareService {
    abstract list(middleware: string):Promise<Array<string>>;
    abstract add(middleware: string, name: string, content: Buffer) : Promise<string>;
    abstract remove(middleware: string, name: string) : Promise<void>;
    abstract save(middleware: string, name: string, content: Buffer): Promise<void>;
    // FIXME: read should return a Buffer
    abstract read(middleware: string, name: string): Promise<Buffer>;
}

@AutoWired
@Provides(MiddlewareService)
class RedisMiddlewareService implements MiddlewareService {
    private static MIDDLEWARE_PREFIX = "{config}:middleware";
    @Inject
    private database: Database;

    list(middleware: string) : Promise<Array<string>>{
        return new Promise<Array<string>>((resolve, reject) =>{
            this.database.redisClient.smembers(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`)
                    .then(resolve)
                    .catch(reject);
        });
    }

    add(middleware: string, name: string, content: Buffer) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.save(middleware, name, content)
                    .then(() => {
                        resolve(name);
                    })
                    .catch(reject);
        });
    }

    remove(middleware: string, name: string) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.redisClient.multi()
                    .srem(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`, name)
                    .del(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`)
                    .publish(ConfigTopics.MIDDLEWARE_REMOVED, JSON.stringify({type: middleware, name: name, idMsg: uuid()}))
                    .exec()
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
        });
    }

    save(middleware: string, name: string, content: Buffer): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.redisClient.multi()
                    .sadd(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}`, name)
                    .set(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`, content)
                    .publish(ConfigTopics.MIDDLEWARE_UPDATED, JSON.stringify({type: middleware, name: name, idMsg: uuid()}))
                    .exec()
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
        });
    }

    read(middleware: string, name: string): Promise<Buffer> {
        return this.database.redisClient.get(`${RedisMiddlewareService.MIDDLEWARE_PREFIX}:${middleware}:${name}`);
    }
}