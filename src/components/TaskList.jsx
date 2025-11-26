import React from "react";
import { List, Button } from "antd";

export default function TaskList({ tasks = [], onComplete }) {
  return (
    <List
      dataSource={tasks}
      renderItem={(t) => (
        <List.Item actions={[<Button type="link" onClick={() => onComplete(t._id)}>Mark Completed</Button>]}>
          <List.Item.Meta title={t.title} description={t.description} />
          <div>{t.status}</div>
        </List.Item>
      )}
    />
  );
}
