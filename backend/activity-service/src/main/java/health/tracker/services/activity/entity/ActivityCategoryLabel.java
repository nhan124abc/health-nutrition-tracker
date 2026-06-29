package health.tracker.services.activity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "activity_category_labels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityCategoryLabel {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActivityType.Category category;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_vi", length = 100)
    private String nameVi;

    @Column(name = "hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Transient
    private long activityTypeCount;
}
