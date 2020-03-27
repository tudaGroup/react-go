import React from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { Button, Input, Select, Row, Col } from 'antd';
const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  return (
    <div className='main'>
      <div className='container'>
        <Row gutter={[40, 40]}>
          <Col span={24}>
            <div className='edit__title'>Edit Profile</div>
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={12}>
            <div className='edit__label'>Country</div>
            <Select defaultValue='Germany' style={{ width: '50%' }}>
              <Option value='Germany'>Germany</Option>
              <Option value='USA'>USA</Option>
              <Option value='Korea'>Korea</Option>
              <Option value='Taiwan'>Taiwan</Option>
              <Option value='Sweden'>Sweden</Option>
              <Option value='France'>France</Option>
            </Select>
          </Col>
          <Col span={12}>
            <div className='edit__label'>City</div>
            <Input />
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={24}>
            <div className='edit__label'>Biography</div>
            <TextArea rows={4} />
          </Col>
        </Row>
        <Row gutter={[40, 40]}>
          <Col span={12}>
            <div className='edit__label'>Given Name</div>
            <Input />
          </Col>
          <Col span={12}>
            <div className='edit__label'>Last name</div>
            <Input />
          </Col>
        </Row>
        <Row justify='end'>
          <Col>
            <Button type='primary' size='large'>
              <CheckOutlined /> Submit
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Settings;
