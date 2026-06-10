import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { goalFormulaKeys, goalOptions, profileFields } from '../profileUtils';

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
                  <Form.Label>{t(labelKey)}</Form.Label>
                  <Form.Control type={type} name={name} value={profile[name]} onChange={onChange} disabled={saving} />
                </Form.Group>
              </Col>
            ))}
            <Col md={6}>
              <Form.Group>
                <Form.Label>{t('profile.gender')}</Form.Label>
                <Form.Select name="gender" value={profile.gender} onChange={onChange} disabled={saving}>
                  <option value="">{t('profilePage.selectGender')}</option>
                  <option value="male">{t('profile.male')}</option>
                  <option value="female">{t('profile.female')}</option>
                  <option value="other">{t('profile.other')}</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>{t('profile.activityLevel')}</Form.Label>
                <Form.Select name="activityLevel" value={profile.activityLevel} onChange={onChange} disabled={saving}>
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
                <Form.Label>{t('profilePage.fields.healthGoal')}</Form.Label>
                <Form.Select name="healthGoal" value={profile.healthGoal} onChange={onChange} disabled={saving}>
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
