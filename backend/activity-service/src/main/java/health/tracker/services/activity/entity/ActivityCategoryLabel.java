package health.tracker.services.activity.entity;

import jakarta.persistence.*;
import lombok.*;

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
    @Column(length = 20)
    private ActivityType.Category category;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_vi", length = 100)
    private String nameVi;

    @Column(nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Transient
    private long activityTypeCount;
}
