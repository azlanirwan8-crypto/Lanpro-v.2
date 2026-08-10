import crypto from 'crypto';
import mysqlPool from '../../src/lib/db';
import { createAuditLog } from '../services/audit.service';
import { broadcastProjectNotification, sendProjectActivityNotification, checkUpcomingDueDates } from '../services/notification.service';
import { GoogleGenAI, Type } from '@google/genai';

