CREATE TABLE transaction_rollback_probe (
  probe_id bigint PRIMARY KEY,
  note text NOT NULL
);

INSERT INTO transaction_rollback_probe (probe_id, note)
VALUES (1, 'this row must roll back');

SELECT 1 / 0;
