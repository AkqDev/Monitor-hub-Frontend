import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Table,
  Tag,
  Popconfirm,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Spin
} from 'antd';
import {
  ListTodo,
  Plus,
  Trash,
  Check,
  Play,
  Loader
} from 'lucide-react';
import moment from 'moment';
import { api, authHeader } from '../../utils/api';
import '@fontsource/poppins'; // match font-[poppins]

const { Option } = Select;

export default function TaskManager({ token }) {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  /* ================= FETCH TASKS & EMPLOYEES ================= */
  const fetchTasksAndEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const tasksRes = await api.get('/api/tasks', authHeader(token));
      const employeesRes = await api.get('/api/admin/employees', authHeader(token));

      setTasks(tasksRes.data.map(task => ({ ...task, key: task._id })));
      setEmployees(employeesRes.data.filter(u => u.role === 'employee'));
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasksAndEmployees();
  }, [fetchTasksAndEmployees]);

  /* ================= CREATE TASK ================= */
  const handleCreateTask = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      };

      const res = await api.post('/api/tasks', payload, authHeader(token));
      message.success('Task successfully created and assigned.');
      setTasks(prev => [{ ...res.data.task, key: res.data.task._id }, ...prev]);
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE TASK ================= */
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`, authHeader(token));
      message.success('Task deleted successfully.');
      setTasks(prev => prev.filter(task => task._id !== taskId));
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to delete task.');
    }
  };

  /* ================= STATUS TAG ================= */
  const getStatusTag = (status) => {
    const mapping = {
      'in-progress': { color: 'green', icon: <Play className="w-4 h-4" />, text: 'In Progress' },
      completed: { color: 'green', icon: <Check className="w-4 h-4" />, text: 'Completed' },
    };
    const s = mapping[status] || mapping.pending;
    return (
      <Tag color={s.color} className="!flex !items-center gap-1 font-semibold !py-1">
        {s.icon} {s.text}
      </Tag>
    );
  };

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a,b)=>a.title.localeCompare(b.title) },
    { 
      title: 'Assigned To', 
      dataIndex: ['assignee','name'], 
      key: 'assignee',
      render: text => <Tag className="bg-black text-white font-semibold">{text}</Tag>,
      sorter: (a,b)=>a.assignee.name.localeCompare(b.assignee.name)
    },
    { title: 'Status', dataIndex: 'status', key: 'status', render: getStatusTag, sorter: (a,b)=>a.status.localeCompare(b.status) },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: date=>moment(date).format('MMM D, YYYY'), sorter: (a,b)=>moment(a.dueDate).unix() - moment(b.dueDate).unix() },
    { title: 'Assigned By', dataIndex: ['assignedBy','name'], key: 'assignedBy' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Are you sure you want to delete this task?" onConfirm={()=>handleDeleteTask(record._id)} okText="Yes" cancelText="No">
          <Button type="primary" danger icon={<Trash className="w-4 h-4"/>} size="small" className="!bg-green-500 !font-semibold !border-none font-[poppins]">Delete</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="!bg-black/25 rounded-2xl p-6 !border-0 font-inter">
      <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2 !text-green-500 font-[poppins]">
          <ListTodo className="w-6 h-6 text-green-500" /> Task Management
        </h2>

        <Button type="primary" onClick={()=>setIsModalVisible(true)} icon={<Plus className="w-4 h-4"/>} className="flex items-center gap-1 !text-gray-100 !bg-green-500 !border-0 rounded-full font-[poppins] !px-6 !py-3 !font-semibold ">Assign New Task</Button>
      </div>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={tasks} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} className="dark-table" rowClassName={()=>"bg-black/5"} onRow={()=>({ style: { cursor: 'default', background: 'black/25' }})}/>
      </Spin>

      <Modal title={<span className="font-[poppins] text-black font-semibold">Assign a New Task</span>} open={isModalVisible} onCancel={()=>{setIsModalVisible(false);form.resetFields();}} footer={null} maskClosable={!loading} className="custom-ant-modal">
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleCreateTask} className="mt-4">
          <Form.Item name="title" label={<span className="font-[poppins] text-black font-semibold">Task Title</span>} rules={[{required:true,message:'Enter a task title'}]}>
            <Input placeholder="e.g. Design Q3 Sales Report"/>
          </Form.Item>
          <Form.Item name="description" label={<span className="font-[poppins] text-black font-semibold">Task Details</span>} rules={[{required:true,message:'Describe the task'}]}>
            <Input.TextArea rows={4} placeholder="Add instructions..."/>
          </Form.Item>
          <Form.Item name="assignee" label={<span className="font-[poppins] text-black font-semibold">Assign To</span>} rules={[{required:true,message:'Select an employee'}]}>
            <Select showSearch placeholder="Select employee">
              {employees.map(emp => <Option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="dueDate" label={<span className="font-[poppins] text-black font-semibold">Deadline</span>} rules={[{required:true,message:'Select a due date'}]}>
            <DatePicker className="w-full" disabledDate={current => current && current < moment().endOf('day')}/>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} className="w-full !bg-green-600 hover:!bg-green-700 border-none !font-bold">Assign Task</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
