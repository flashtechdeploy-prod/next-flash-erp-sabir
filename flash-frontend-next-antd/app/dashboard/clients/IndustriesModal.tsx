'use client';

import { useState, useEffect } from 'react';
import { Modal, List, Input, Button, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { clientApi } from '@/lib/api';

interface Industry {
    id: number;
    name: string;
}

interface IndustriesModalProps {
    open: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function IndustriesModal({ open, onClose, onUpdate }: IndustriesModalProps) {
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(false);
    const [newIndustry, setNewIndustry] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchIndustries = async () => {
        setLoading(true);
        const response = await clientApi.getIndustries();
        setLoading(false);

        if (response.error) {
            message.error(response.error);
            return;
        }

        setIndustries(response.data as Industry[] || []);
    };

    useEffect(() => {
        if (open) {
            fetchIndustries();
        }
    }, [open]);

    const handleAdd = async () => {
        if (!newIndustry.trim()) {
            message.warning('Please enter an industry name');
            return;
        }

        setSubmitting(true);
        const response = await clientApi.createIndustry({ name: newIndustry.trim() });
        setSubmitting(false);

        if (response.error) {
            message.error(response.error);
            return;
        }

        message.success('Industry added successfully');
        setNewIndustry('');
        fetchIndustries();
        if (onUpdate) onUpdate();
    };

    const handleDelete = async (id: number) => {
        const response = await clientApi.deleteIndustry(id);
        if (response.error) {
            message.error(response.error);
            return;
        }

        message.success('Industry deleted successfully');
        fetchIndustries();
        if (onUpdate) onUpdate();
    };

    return (
        <Modal
            title="Manage Industries"
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <div className="mb-4">
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        placeholder="Add new industry..."
                        value={newIndustry}
                        onChange={(e) => setNewIndustry(e.target.value)}
                        onPressEnter={handleAdd}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        loading={submitting}
                    >
                        Add
                    </Button>
                </Space.Compact>
            </div>

            <List
                loading={loading}
                bordered
                dataSource={industries}
                className="max-h-[400px] overflow-y-auto"
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Popconfirm
                                key="delete"
                                title="Delete Industry"
                                description="Are you sure you want to delete this industry? This might affect existing clients."
                                onConfirm={() => handleDelete(item.id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Popconfirm>
                        ]}
                    >
                        {item.name}
                    </List.Item>
                )}
            />
        </Modal>
    );
}
