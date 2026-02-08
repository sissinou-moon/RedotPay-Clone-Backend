import crypto from "crypto";

export function generateUUID() {
    return crypto.randomUUID();
}

export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString().padStart(6, "0");
}

export function hashText(text: string) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

export function generateUsername() {
    return `user${Math.floor(100000 + Math.random() * 900000).toString().padStart(9, "0")}`;
}