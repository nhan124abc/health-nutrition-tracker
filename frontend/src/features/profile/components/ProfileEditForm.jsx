import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { goalFormulaKeys, goalOptions, profileFields, requiredProfileFields } from '../profileUtils';

const requiredFieldNames = new Set(requiredProfileFields.map(([name]) => name));

function RequiredLabel({ children, name }) {
  return (
    <Form.Label>
      {children}
      {requiredFieldNames.has(name) && <span className="text-danger ms-1">*</span>}
    </Form.Label>
  );
}

function ProfileEditForm({ onChange, onSubmit, profile, saving, t }) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <Card.Title className="fw-bold mb-3">{t('profilePage.updateProfile')}</Card.Title>
        <Form onSubmit={onSubmit}>
          <Row className="g-3">
            {profileFields.map(([name, labelKey, type]) => (
              <Col md={6} key={name}>
                <Form.Group>
                  <RequiredLabel name={name}>{t(labelKey)}</RequiredLabel>
                  <Form.Control type={type} name={name} value={profile[name]} onChange={onChange} disabled={saving} required={requiredFieldNames.has(name)} />
                </Form.Group>
              </Col>
            ))}
            <Col md={6}>
              <Form.Group>
                <RequiredLabel name="gender">{t('profile.gender')}</RequiredLabel>
                <Form.Select name="gender" value={profile.gender} onChange={onChange} disabled={saving} required>
                  <option value="">{t('profilePage.selectGender')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                  <option value="other">{t('profile.other')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <RequiredLabel name="activityLevel">{t('profile.activityLevel')}</RequiredLabel>
                <Form.Select name="activityLevel" value={profile.activityLevel} onChange={onChange} disabled={saving} required>
                  <option value="">{t('profile.selectActivity')}</option>
                  <option value="sedentary">{t('profile.sedentary')}</option>
                  <option value="light">{t('profile.light')}</option>
                  <option value="moderate">{t('profile.moderate')}</option>
                  <option value="active">{t('profile.active')}</option>
                  <option value="very_active">{t('profile.veryActive')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <RequiredLabel name="healthGoal">{t('profilePage.fields.healthGoal')}</RequiredLabel>
                <Form.Select name="healthGoal" value={profile.healthGoal} onChange={onChange} disabled={saving} required>
                  <option value="">{t('profilePage.selectGoal')}</option>
                  {goalOptions.map((goal) => (
                    <option value={goal.value} key={goal.value}>{t(goal.labelKey)}</option>
                  ))}
                </Form.Select>
                {profile.healthGoal && (
                  <Form.Text className="text-secondary">
                    {t(goalFormulaKeys[profile.healthGoal])}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>{t('common.bio')}</Form.Label>
                <Form.Control as="textarea" rows={3} name="bio" value={profile.bio} onChange={onChange} disabled={saving} />
              </Form.Group>
            </Col>
            <Col xs={12} className="d-flex justify-content-end">
              <Button variant="success" type="submit" disabled={saving}>
                {saving ? t('profilePage.saving') : t('profilePage.saveProfile')}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default ProfileEditForm;
