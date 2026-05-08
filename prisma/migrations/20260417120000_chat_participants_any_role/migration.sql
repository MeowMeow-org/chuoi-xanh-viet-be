-- Chat: hai người tham gia (participant_1 < participant_2 theo UUID), không phân role.
-- Cảnh báo: xóa dữ liệu chat cũ (schema consumer/farmer) — phù hợp môi trường dev/MVP.

DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_conversations;

CREATE TABLE chat_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    participant_1_id UUID NOT NULL,
    participant_2_id UUID NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_chat_conversations PRIMARY KEY (id),
    CONSTRAINT fk_chat_conv_p1 FOREIGN KEY (participant_1_id) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_chat_conv_p2 FOREIGN KEY (participant_2_id) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT uq_chat_conv_participants UNIQUE (participant_1_id, participant_2_id),
    CONSTRAINT chk_chat_participant_order CHECK (participant_1_id < participant_2_id)
);

CREATE INDEX idx_chat_conv_p1_updated ON chat_conversations (participant_1_id, updated_at DESC);
CREATE INDEX idx_chat_conv_p2_updated ON chat_conversations (participant_2_id, updated_at DESC);

CREATE TABLE chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_chat_messages PRIMARY KEY (id),
    CONSTRAINT fk_chat_msg_conv FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT fk_chat_msg_sender FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX idx_chat_msg_conv_created ON chat_messages (conversation_id, created_at);
