'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Upload, message, App } from 'antd';
import { UploadOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { companySettingsApi } from '@/lib/api';
import { getFullFileUrl } from '@/lib/utils'; 

export default function CompanySettingsForm() {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [imageUrl, setImageUrl] = useState<string>();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await companySettingsApi.get();
            form.setFieldsValue(data);
            if (data.logo_url) {
                setImageUrl(getFullFileUrl(data.logo_url));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            message.error('Failed to load company settings');
        } finally {
            setFetching(false);
        }
    };

    console.log('Form values:', fetching);

    const onFinish = async (values: any) => {
        setLoading(true);
        const formData = new FormData();
        Object.keys(values).forEach(key => {
            if (key !== 'logo' && values[key]) {
                formData.append(key, values[key]);
            }
        });

        if (values.logo && values.logo[0] && values.logo[0].originFileObj) {
            formData.append('logo', values.logo[0].originFileObj);
        }

        try {
            const { data } = await companySettingsApi.update(formData);
            message.success('Settings updated successfully');
            if (data.logo_url) {
                setImageUrl(getFullFileUrl(data.logo_url));
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            message.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const normFile = (e: any) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    const uploadButton = (
        <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Upload Logo</div>
        </div>
    );

    return (
        <Card title="Company Information" loading={fetching}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item label="Company Logo" name="logo" valuePropName="fileList" getValueFromEvent={normFile}>
                    <Upload
                        name="logo"
                        listType="picture-card"
                        maxCount={1}
                        beforeUpload={() => false}
                        showUploadList={false}
                    >
                        {imageUrl ? <img src={imageUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : uploadButton}
                    </Upload>
                </Form.Item>

                <Form.Item name="name" label="Company Name" rules={[{ required: true }]}>
                    <Input placeholder="Flash Security Services" />
                </Form.Item>

                <Form.Item name="address" label="Address">
                    <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item name="phone" label="Phone">
                    <Input />
                </Form.Item>

                <Form.Item name="email" label="Email">
                    <Input />
                </Form.Item>

                <Form.Item name="website" label="Website">
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        Save Changes
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}
