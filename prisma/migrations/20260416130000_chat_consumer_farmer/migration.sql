-- Chat MVP: one conversation per consumer–farmer pair

CREATE TABLE chat_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    consumer_user_id UUID NOT NULL,
    farmer_user_id UUID NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_chat_conversations PRIMARY KEY (id),
    CONSTRAINT fk_chat_conv_consumer FOREIGN KEY (consumer_user_id) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_chat_conv_farmer FOREIGN KEY (farmer_user_id) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT uq_chat_conv_consumer_farmer UNIQUE (consumer_user_id, farmer_user_id)
);

CREATE INDEX idx_chat_conv_consumer_updated ON chat_conversations (consumer_user_id, updated_at DESC);
CREATE INDEX idx_chat_conv_farmer_updated ON chat_conversations (farmer_user_id, updated_at DESC);

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
