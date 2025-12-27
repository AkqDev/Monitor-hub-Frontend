import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  List,
  Tag,
  Popconfirm,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  message,
  Spin,
} from "antd";
import { CalendarPlus, Trash, Plus, Edit, MapPin, Clock } from "lucide-react";
import moment from "moment";
import { api, authHeader } from "../../utils/api";

const { Option } = Select;

export default function EventManagerPanel({ token, isAdmin = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form] = Form.useForm();

  const getTypeColor = (type) => {
    switch (type) {
      case "annual":
        return "purple";
      case "special":
        return "pink";
      default:
        return "blue";
    }
  };

  // ---------- Fetch Events ----------
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        isAdmin ? "/api/admin/events" : "/api/events",
        authHeader(token)
      );

      const data = (res.data || []).map((e) => ({
        ...e,
        key: e._id,
        date: e.startTime, // map backend startTime to frontend date
      }));
      setEvents(data);
    } catch (error) {
      message.error(error.response?.data?.error || "Failed to fetch events.");
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ---------- Create / Update ----------
  const handleCreateUpdate = async (values) => {
    setLoading(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        location: values.location,
        type: values.type,
        startTime: values.date?.toISOString(), // ✅ send startTime consistently
      };

      let res;

      if (isEdit) {
        const id = form.getFieldValue("_id");
        res = await api.put(
          `/api/admin/events/${id}`,
          payload,
          authHeader(token)
        );

        setEvents((prev) =>
          prev.map((e) =>
            e._id === id
              ? { ...res.data.event, key: id, date: res.data.event.startTime }
              : e
          )
        );

        message.success("Event updated successfully.");
      } else {
        res = await api.post(
          "/api/admin/events",
          payload,
          authHeader(token)
        );

        setEvents((prev) => [
          { ...res.data.event, key: res.data.event._id, date: res.data.event.startTime },
          ...prev,
        ]);

        message.success("Event created successfully.");
      }

      setIsModalVisible(false);
      setIsEdit(false);
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/events/${id}`, authHeader(token));
      setEvents((prev) => prev.filter((e) => e._id !== id));
      message.success("Event deleted.");
    } catch (error) {
      message.error(error.response?.data?.error || "Delete failed.");
    }
  };

  // ---------- Modal Helpers ----------
  const openCreate = () => {
    form.resetFields();
    setIsEdit(false);
    setIsModalVisible(true);
  };

  const openEdit = (event) => {
    form.setFieldsValue({
      ...event,
      date: moment(event.date),
      _id: event._id,
    });
    setIsEdit(true);
    setIsModalVisible(true);
  };

  const visibleEvents = isAdmin
    ? events
    : events.filter((e) => moment(e.date).isSameOrAfter(moment(), "day"));

  return (
    <Card 
      title={
        <div className=" flex items-center gap-2 !text-green-500 !font-xl !font-semibold font-[poppins]">
          <CalendarPlus className="w-5 h-5" />
          {isAdmin ? "Event Manager" : "Upcoming Events"}
        </div>
      }
      className="!bg-black/25 backdrop-blur-xl !rounded-2xl !border-0 "
      extra={
        isAdmin && (
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreate}
            className="!bg-green-500 rounded-full !border-0 !outline-0 !font-semibold font-[poppins]"
          >
            New Event
          </Button>
        )
      }
    >
      <Spin spinning={loading}>
        <List
          dataSource={visibleEvents}
          locale={{
            emptyText: (
              <span className="!text-green-500 !font-semibold font-[poppins]">No events found.</span>
            ),
          }}
          renderItem={(event) => (
            <List.Item
              className="!border-b !border-white/10 hover:bg-white/5 transition-all p-3 rounded-lg"
              actions={
                isAdmin
                  ? [
                      <Button
                        className="!text-green-500 !bg-gray-200 !rounded-xl !font-semibold font-[poppins]"
                        type="link"
                        icon={<Edit className="w-4 h-4" />}
                        onClick={() => openEdit(event)}
                      >
                        Edit
                      </Button>,
                      <Popconfirm
                        title="Delete this event?"
                        onConfirm={() => handleDelete(event._id)}
                      >
                        <Button
                          className="!text-gray-200 !bg-green-500 !rounded-xl !font-semibold font-[poppins]"
                          type="link"
                          danger
                          icon={<Trash className="w-4 h-4" />}
                        >
                          Delete
                        </Button>
                      </Popconfirm>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center gap-2 text-white font-medium">
                    {event.title}
                    <Tag color={getTypeColor(event.type)}>
                      {event.type?.toUpperCase()}
                    </Tag>
                  </div>
                }
                description={
                  <div className="text-purple-300 text-sm space-y-1">
                    <p>{event.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(event.date).format("MMM D, YYYY h:mm A")}
                      </span>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Spin>

      {/* Create / Edit Modal */}
      {isAdmin && (
        <Modal
          title={
            <span className="text-white">
              {isEdit ? "Edit Event" : "Create Event"}
            </span>
          }
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setIsEdit(false);
            form.resetFields();
          }}
          footer={null}
          className="custom-ant-modal"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateUpdate}
              className="mt-4"
              requiredMark={false}
            >
              {isEdit && (
                <Form.Item name="_id" hidden>
                  <Input />
                </Form.Item>
              )}

              <Form.Item
                name="title"
                label={<span className="!font-semibold font-[poppins]">Title</span>}
                rules={[{ required: true }]}
              >
                <Input className="dark-input" />
                </Form.Item>

              <Form.Item
                name="description"
                label={<span className="!font-semibold font-[poppins]">Description</span>}
              >
                <Input.TextArea rows={1} className="dark-input" />
              </Form.Item>

              <Form.Item
                name="date"
                label={<span className="!font-semibold font-[poppins]">Date & Time</span>}
                rules={[{ required: true }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  className="dark-input w-full"
                />
              </Form.Item>

              <Form.Item
                name="location"
                label={<span className="!font-semibold font-[poppins]">Location</span>}
                rules={[{ required: true }]}
              >
                <Input className="dark-input" />
              </Form.Item>

              <Form.Item
                name="type"
                label={<span className="!font-semibold font-[poppins]">Type</span>}
                initialValue="regular"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="regular">Regular</Option>
                  <Option value="annual">Annual</Option>
                  <Option value="special">Special</Option>
                </Select>
              </Form.Item>

              <Button
                htmlType="submit"
                type="primary"
                loading={loading}
                className="w-full !bg-green-500 !border-0 !outline-0 mt-4 !font-semibold !font-[poppins]"
              >
                {isEdit ? "Update Event" : "Create Event"}
              </Button>
            </Form>
        </Modal>
      )}
    </Card>
  );
}