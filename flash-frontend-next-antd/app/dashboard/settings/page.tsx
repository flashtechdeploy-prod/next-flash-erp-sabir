import { App } from 'antd';
import CompanySettingsForm from './CompanySettingsForm';

export default function SettingsPage() {
    return (
        <App>
            <div className="p-6 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>
                <CompanySettingsForm />
            </div>
        </App>
    );
}
