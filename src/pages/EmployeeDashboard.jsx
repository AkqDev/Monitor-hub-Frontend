import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Button, Card, notification, Modal, Calendar } from "antd";
import ScreenShare from "../components/ScreenShare";
import TaskList from "../components/TaskList";
import axios from "axios";
import { socket } from "../utils/socket.io";

export default function EmployeeDashboard() {
  const { auth } = useContext(AuthContext);
  const [screenOn, setScreenOn] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [fines, setFines] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  // Attendance state
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  const api = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Working hours constants
  const WORK_START = 10; // 10 AM
  const WORK_END = 20;   // 8 PM

  // Helper: check working hours
  const isWithinWorkingHours = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= WORK_START && hour < WORK_END;
  };

  // Helper: message for outside hours
  const getAfterHoursMessage = () => {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();

    if (hour < WORK_START) {
      const diffHrs = WORK_START - hour - 1;
      const diffMins = 60 - min;
      return `Working hours start at 10:00 AM. You are ${diffHrs}h ${diffMins}m early.`;
    } else if (hour >= WORK_END) {
      const diffHrs = hour - WORK_END;
      return `You are ${diffHrs}h ${min}m past working hours (ended at 8:00 PM).`;
    }
    return null;
  };

  // Fetch tasks and fines + handle real-time updates
  useEffect(() => {
    if (!auth.token) return;

    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${api}/api/tasks`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setTasks(res.data.tasks || []);
      } catch (err) {
        console.warn(err);
      }
    };

    const fetchFines = async () => {
      try {
        const res = await axios.get(`${api}/api/fines`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setFines(res.data.fines || []);
      } catch (err) {
        console.warn(err);
      }
    };

    fetchTasks();
    fetchFines();

    const handleAssignedTask = ({ task }) => {
      if (task.assignedTo === auth.user.id) {
        notification.info({ message: "New Task", description: task.title });
        setTasks((prev) => [task, ...prev]);
      }
    };

    const handleAssignedFine = ({ fine }) => {
      if (fine.userId === auth.user.id) {
        notification.warning({
          message: "New Fine",
          description: `${fine.reason} — Amount: ${fine.amount}`,
        });
        setFines((prev) => [fine, ...prev]);
      }
    };

    socket.on("task:assigned", handleAssignedTask);
    socket.on("fine:assigned", handleAssignedFine);

    return () => {
      socket.off("task:assigned", handleAssignedTask);
      socket.off("fine:assigned", handleAssignedFine);
    };
  }, [auth]);

  // Start session
  const startSession = async () => {
    if (!isWithinWorkingHours()) {
      notification.warning({
        message: "Outside Working Hours",
        description: getAfterHoursMessage(),
      });
      return;
    }
    try {
      const res = await axios.post(
        `${api}/api/stream/start`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setSessionId(res.data.sessionId);
      notification.success({ message: "Session started" });
    } catch (err) {
      console.error(err);
      notification.error({ message: "Failed to start session" });
    }
  };

  // Stop session
  const stopSession = async () => {
    try {
      await axios.post(
        `${api}/api/stream/stop`,
        { sessionId },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setSessionId(null);
      setScreenOn(false);
      notification.success({ message: "Session stopped" });
    } catch (err) {
      console.error(err);
      notification.error({ message: "Failed to stop session" });
    }
  };

  // Complete task
  const handleComplete = async (taskId) => {
    try {
      const res = await axios.put(
        `${api}/api/tasks/${taskId}`,
        { status: "Completed" },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      notification.success({ message: "Task completed" });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.data.task : t))
      );
      socket.emit("task:completed", { task: res.data.task });
    } catch (err) {
      notification.error({ message: "Failed to mark task as completed" });
    }
  };

  // Mark attendance (restricted to working hours)
  const markAttendance = (date) => {
    if (!isWithinWorkingHours()) {
      notification.warning({
        message: "Attendance Restricted",
        description: getAfterHoursMessage(),
      });
      return;
    }

    const formatted = date.format("YYYY-MM-DD");
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (formatted !== today) {
      notification.warning({
        message: "Invalid Date",
        description: "You can only mark attendance for today.",
      });
      return;
    }

    if (markedDates[today]) {
      notification.info({
        message: "Already Marked",
        description: "You have already marked attendance for today.",
      });
      return;
    }

    setMarkedDates((prev) => ({ ...prev, [today]: true }));
    notification.success({
      message: "Attendance Marked",
      description: `You marked attendance for ${today}`,
    });
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className=" text-2xl md:text-4xl font-bold m-5 text-[#083b75]">
          Employee Dashboard
        </h1>
        <div className="flex gap-2">
          {!sessionId ? (
            <Button
              onClick={startSession}
              style={{ backgroundColor: "#083b75", color: "#f3f8fc" }}
            >
              Start Session
            </Button>
          ) : (
            <Button
              onClick={stopSession}
              style={{ backgroundColor: "#083b75", color: "#f3f8fc" }}
            >
              Stop Session
            </Button>
          )}

          {/* Attendance Button */}
          <Button
            className="bg-[#f3f8fc] text-[#083b75]"
            onClick={() => setAttendanceModal(true)}
          >
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Attendance Modal */}
      <Modal
        title="Daily Attendance"
        open={attendanceModal}
        onCancel={() => setAttendanceModal(false)}
        footer={null}
        centered
        maskStyle={{ backdropFilter: "blur(2px)" }}
        width={600}
      >
        <Calendar
          fullscreen={false}
          dateCellRender={(date) => {
            const formatted = date.format("YYYY-MM-DD");
            return markedDates[formatted] ? (
              <div className="bg-green-500 text-white text-xs rounded px-1">
                Present
              </div>
            ) : null;
          }}
          onSelect={markAttendance}
          disabledDate={(current) => {
            const today = new Date().toISOString().split("T")[0];
            return current.format("YYYY-MM-DD") !== today;
          }}
        />
        <p className="mt-3 text-gray-600 text-sm">
          Click on today’s date to mark your attendance.
        </p>
      </Modal>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Screen Share only */}
        <div className="lg:col-span-2 space-y-4">
          {/* Screen Share Card */}
          <Card>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-2xl text-[#083b75]">Screen Share</h3>
                              <p className="text-sm text-gray-500 mt-1">
                  Your screen is now live and accessible to the admin in real time.
                </p>
              </div>
              <Button
                onClick={() => setScreenOn((s) => !s)}
                disabled={!sessionId}
              >
                {screenOn ? "Stop Sharing" : "Share Screen"}
              </Button>
            </div>
            <div className="aspect-video bg-gray-900 rounded overflow-hidden">
              <ScreenShare room={sessionId} enabled={screenOn} />
            </div>
          </Card>
        </div>

        {/* Right: Session Info & Tasks */}
        <div className="space-y-4">
          {/* Session Info */}
          <div className="mt-1.5">
            <Card>
              <h4 className="font-bold text-[#083b75]">Session Info</h4>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <div>
                  Status:{" "}
                  <span className={sessionId ? "text-green-600" : "text-red-600"}>
                    {sessionId ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  Last seen:{" "}
                  {new Date(auth.user?.lastSeen || Date.now()).toLocaleString()}
                </div>
                <div>
                  {isWithinWorkingHours() ? (
                    <span className="text-green-600 font-semibold">
                      ✅ Within Working Hours (10 AM – 8 PM)
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold">
                      ⏰ {getAfterHoursMessage()}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Task List */}
          <div className="mt-1.5">
            <Card>
              <h4 className="font-bold text-[#083b75]">Tasks</h4>
              <TaskList tasks={tasks} onComplete={handleComplete} />
            </Card>
          </div>

          {/* Fines */}
          <div className="mt-1.5">
            <Card>
              <h4 className="font-bold text-[#083b75]">Fines</h4>
              {fines.length === 0 ? (
                <p className="text-gray-500 text-sm mt-2">No fines assigned 🎉</p>
              ) : (
                <ul className="divide-y divide-gray-200 mt-2">
                  {fines.map((fine) => (
                    <li
                      key={fine._id}
                      className="py-2 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-red-600 font-semibold">{fine.reason}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(fine.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                        Rs {fine.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
