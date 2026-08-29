import { createHash, createHmac } from "node:crypto";

import pg from "pg";
import { describe, expect, test } from "vitest";

const { Client } = pg;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function signedS3Headers(url, accessKey, secretKey, now = new Date()) {
  const amzDate = now.toISOString().replaceAll(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const region = "us-east-1";
  const service = "s3";
  const payloadHash = sha256("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    "GET",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${secretKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  return {
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
}

describe("DISC-04 disposable services", () => {
  test("PostgreSQL accepts an isolated transaction", async () => {
    const client = new Client({
      connectionString: required("PETRA_TEST_POSTGRES_URL"),
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "SELECT current_database() AS database, 1 AS value",
      );
      await client.query("ROLLBACK");
      expect(result.rows).toEqual([{ database: "petra", value: 1 }]);
    } finally {
      await client.end();
    }
  });

  test("Neo4j executes a Cypher query over its authenticated HTTP API", async () => {
    const response = await fetch(
      `${required("PETRA_TEST_NEO4J_HTTP_URL")}/db/neo4j/tx/commit`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from("neo4j:petra-disc04-neo4j").toString("base64")}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          statements: [{ statement: "RETURN 1 AS value" }],
        }),
      },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.errors).toEqual([]);
    expect(body.results[0].data[0].row[0]).toBe(1);
  });

  test("the S3-compatible service returns the provisioned bucket", async () => {
    const url = new URL(required("PETRA_TEST_S3_URL"));
    const response = await fetch(url, {
      headers: signedS3Headers(
        url,
        "petra-disc04-access",
        "petra-disc04-secret",
      ),
    });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain("petra-disc04-artifacts");
  });

  test("the controlled failure probe is disabled", () => {
    expect(process.env.PETRA_DISC04_FORCE_FAILURE).not.toBe("1");
  });
});
