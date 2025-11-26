import React, { useEffect, useState, useContext } from "react";
import {
  Card,
  Table,
  Button,
  Tooltip,
  Modal,
  Input,
  DatePicker,
  notification,
} from "antd";
import {
  CheckSquareOutlined,
  DollarCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { socket } from "../utils/socket.io";
import { AuthContext } from "../context/AuthContext";

export default function AdminDashboard() {
  const { logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [taskModal, setTaskModal] = useState(false);
  const [fineModal, setFineModal] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: null,
  });
  const [fineForm, setFineForm] = useState({ reason: "", amount: "" });
  const [streams, setStreams] = useState([]);

  const api = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${api}/api/admin/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers(res.data.users || []);
      } catch (err) {
        console.warn(err);
      }
    };
    fetch();
  }, []);

  // Socket listeners for activity
  useEffect(() => {
    const handleSessionStarted = ({ userId, sessionId }) => {
      if (selectedUser && userId === selectedUser._id) {
        setStreams((prev) => [{ sessionId, userId }, ...prev]);
        notification.info({
          message: "Session started",
          description: `User ${userId} started session`,
        });
      }
    };

    const handleSessionStopped = ({ session }) => {
      setStreams((prev) => prev.filter((s) => s.sessionId !== session._id));
      notification.info({
        message: "Session stopped",
        description: `Session ended`,
      });
    };

    const handleEmployeeIdle = ({ userId }) => {
      if (selectedUser && userId === selectedUser._id) {
        notification.warning({
          message: "Employee Idle",
          description: `User ${userId} has been idle`,
        });
      }
    };

    socket.on("session:started", handleSessionStarted);
    socket.on("session:stopped", handleSessionStopped);
    socket.on("employee:idle", handleEmployeeIdle);

    return () => {
      socket.off("session:started", handleSessionStarted);
      socket.off("session:stopped", handleSessionStopped);
      socket.off("employee:idle", handleEmployeeIdle);
    };
  }, [selectedUser]);

  const openTaskModal = (user) => {
    setSelectedUser(user);
    setTaskModal(true);
  };

  const openFineModal = (user) => {
    setSelectedUser(user);
    setFineModal(true);
  };

  const openActivityModal = (user) => {
    setSelectedUser(user);
    setStreams([]); // reset streams for fresh view
    setActivityModal(true);
  };

  const assignTask = async () => {
    if (!taskForm.title || !taskForm.description || !taskForm.dueDate) {
      return notification.warning({ message: "Please fill all task fields" });
    }
    try {
      await axios.post(
        `${api}/api/tasks`,
        { ...taskForm, assignedTo: selectedUser._id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      notification.success({ message: "Task assigned successfully!" });
      setTaskModal(false);
      setTaskForm({ title: "", description: "", dueDate: null });
    } catch (err) {
      console.error("Task assign error:", err.response?.data || err.message);
      notification.error({ message: "Failed to assign task" });
    }
  };

  const assignFine = async () => {
    if (!fineForm.reason || !fineForm.amount) {
      return notification.warning({ message: "Please fill all fine fields" });
    }
    try {
      const res = await axios.post(
        `${api}/api/fines`,
        { reason: fineForm.reason, amount: Number(fineForm.amount), assignedTo: selectedUser._id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      notification.success({ message: "Fine assigned successfully!" });

      // Emit socket event so employee dashboard updates in real-time
      socket.emit("fine:assigned", { fine: res.data.fine });

      setFineModal(false);
      setFineForm({ reason: "", amount: "" });
    } catch (err) {
      console.error("Fine assign error:", err.response?.data || err.message);
      notification.error({ message: "Failed to assign fine" });
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Role", dataIndex: "role", key: "role" },
    {
      title: "Online",
      dataIndex: "online",
      key: "online",
      render: (o) => (o ? "Online" : "Offline"),
    },
    {
      title: "Last Seen",
      dataIndex: "lastSeen",
      key: "lastSeen",
      render: (val, record) =>
        record.role !== "admin" ? new Date(val).toLocaleString() : "—",
    },
    {
      title: "Tasks",
      key: "tasks",
      render: (_, record) => (
        <Tooltip title="Assign Task">
          <Button
            type="text"
            icon={<CheckSquareOutlined style={{ fontSize: 20, color: "black" }} />}
            onClick={() => openTaskModal(record)}
            className="hover:bg-gray-200 rounded-full"
          />
        </Tooltip>
      ),
    },
    {
      title: "Fines",
      key: "fines",
      render: (_, record) => (
        <Tooltip title="Assign Fine">
          <Button
            type="text"
            icon={<DollarCircleOutlined style={{ fontSize: 20, color: "black" }} />}
            onClick={() => openFineModal(record)}
            className="hover:bg-gray-200 rounded-full"
          />
        </Tooltip>
      ),
    },
    {
      title: "Activity",
      key: "activity",
      render: (_, record) => (
        <Tooltip title="View Activity">
          <Button
            type="text"
            icon={<EyeOutlined style={{ fontSize: 20, color: "black" }} />}
            onClick={() => openActivityModal(record)}
            className="hover:bg-gray-200 rounded-full"
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className=" text-2xl md:text-4xl font-bold m-10 text-[#083b75]">
        Admin Dashboard
      </h1>

      <div className="grid lg:grid-cols-3 gap-4 justify-evenly">
        <div className="m-[5px] ml-10">
          <Card>
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl">{users.length}</div>
          </Card>
        </div>

        <div className="mt-[5px]">
          <Card>
            <div className="text-sm text-gray-500">Active Sessions</div>
            <div className="text-2xl">—</div>
          </Card>
        </div>
      </div>

      <Card>
        <Table dataSource={users} columns={columns} rowKey="_id" />
      </Card>

      {/* Activity Modal */}
      <Modal
        title={`Activity of ${selectedUser?.name}`}
        open={activityModal}
        onCancel={() => setActivityModal(false)}
        footer={null}
        centered
        maskStyle={{ backdropFilter: "blur(2px)" }}
        width={800}
      >
        <div className="grid gap-6">
          {/* Live View */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold">Live View</h3>
            <div className="aspect-video bg-gray-900 rounded mt-3"></div>
          </Card>
        </div>
      </Modal>

           {/* Task Modal */}
      <Modal
        title={`Assign Task to ${selectedUser?.name}`}
        open={taskModal}
        onOk={assignTask}
        onCancel={() => setTaskModal(false)}
        okText="Assign Task"
        centered
        maskStyle={{ backdropFilter: "blur(2px)" }}
      >
        <label className="font-medium">Task Title</label>
        <Input
          placeholder="Enter task title"
          value={taskForm.title}
          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
          className="mb-3"
        />

        <label className="font-medium">Description</label>
        <Input.TextArea
          placeholder="Enter task description"
          value={taskForm.description}
          onChange={(e) =>
            setTaskForm({ ...taskForm, description: e.target.value })
          }
          className="mb-3"
        />

        <label className="font-medium">Last Submission Date</label>
        <DatePicker
          className="w-full mb-3"
          onChange={(date) => setTaskForm({ ...taskForm, dueDate: date })}
        />
      </Modal>

      {/* Fine Modal */}
      <Modal
        title={`Assign Fine to ${selectedUser?.name}`}
        open={fineModal}
        onOk={assignFine}
        onCancel={() => setFineModal(false)}
        okText="Assign Fine"
        centered
        maskStyle={{ backdropFilter: "blur(2px)" }}
      >
        <label className="font-medium">Fine Reason</label>
        <Input
          placeholder="Enter fine reason"
          value={fineForm.reason}
          onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })}
          className="mb-3"
        />

        <label className="font-medium">Fine Amount</label>
        <Input
          type="number"
          placeholder="Enter fine amount"
          value={fineForm.amount}
          onChange={(e) =>
            setFineForm({ ...fineForm, amount: Number(e.target.value) })
          }
          className="mb-3"
        />
      </Modal>
    </div>
  );
}