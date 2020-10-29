#!/usr/bin/env node
'use strict';

const tracer = require('dd-trace').init({ hostname: 'datadog-agent' });
tracer.use('http', { service: 'service-access-control' });

import { Application } from './application';
import './command-line';

const app = new Application();

app.start();
