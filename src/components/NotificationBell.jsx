import React, { useEffect, useState, useContext } from "react";
import { Badge, Drawer, List } from "antd";
import { Bell } from "lucide-react";
import { socket } from "../utils/socket.io";
import { AuthContext } from "../context/AuthContext";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const { auth } = useContext(AuthContext);

  useEffect(() => {
    const onTaskAssigned = (data) => {
      if (data.task.assignedTo === auth.user?.id) {
        setNotifs((n) => [
          { title: "Task assigned", body: data.task.title, time: Date.now() },
          ...n,
        ]);
      }
    };

    const onTaskCompleted = (data) =>
      setNotifs((n) => [
        { title: "Task completed", body: data.task.title, time: Date.now() },
        ...n,
      ]);

    const onIdle = (data) =>
      setNotifs((n) => [
        { title: "Employee idle", body: String(data.userId), time: Date.now() },
        ...n,
      ]);

    socket.on("task:assigned", onTaskAssigned);
    socket.on("task:completed", onTaskCompleted);
    socket.on("employee:idle", onIdle);

    return () => {
      socket.off("task:assigned", onTaskAssigned);
      socket.off("task:completed", onTaskCompleted);
      socket.off("employee:idle", onIdle);
    };
  }, [auth.user?.id]);

  return (
    <>
      <Badge count={notifs.length} size="small">
        <Bell
          className="cursor-pointer"
          onClick={() => setOpen(true)}
          style={{ fontSize: 20 }}
        />
      </Badge>

      <Drawer
        title="Notifications"
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
      >
        <List
          dataSource={notifs}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={
                  <>
                    <div>{item.body}</div>
                    <small className="text-gray-400">
                      {new Date(item.time).toLocaleString()}
                    </small>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}